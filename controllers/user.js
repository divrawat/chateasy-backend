import dotenv from "dotenv";
import User from "../models/user.js";
import nodemailer from 'nodemailer';
import jwt from "jsonwebtoken";
dotenv.config();
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import multer from "multer";
import Message from '../models/message.js'
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;


const storage = multer.memoryStorage()
export const upload = multer({ storage });

const s3Client = new S3Client({
    region: process.env.R2_REGION,
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});


export const decrypt = (text) => {
    if (!text || typeof text !== "string") return text;
    try {
        const [ivHex, encryptedText] = text.split(":");
        if (!ivHex || !encryptedText) return text;
        const iv = Buffer.from(ivHex, "hex");
        const encryptedBuffer = Buffer.from(encryptedText, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedBuffer, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        console.error("Decryption error:", error);
        return text;
    }
};





const JWT_SECRET = process.env.JWT_SECRET;


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    tls: { rejectUnauthorized: false },
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();


export const sendOTP = async (req, res) => {
    try {
        var { email, phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        let user = await User.findOne({ phone });
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        if (!user) {
            if (!email) {
                return res.status(400).json({ message: "Email is required for signup" });
            }
            user = new User({ email, phone, otp, otpExpiresAt });
        } else {
            email = user.email;
            if (!email) { return res.status(500).json({ message: "Email not found for this phone number" }); }
            user.otp = otp;
            user.otpExpiresAt = otpExpiresAt;
        }

        await user.save();

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};


export const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        const user = await User.findOne({ phone });

        if (!user) { return res.status(404).json({ message: "User not found" }); }

        if (!user.otp || user.otp !== otp || user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Mark user as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        const token = jwt.sign({ userId: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: "10d" });
        res.status(200).json({ message: "OTP verified successfully", token, userId: user._id });

    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
    }
};



/*
export const fetchUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate({
                path: "friendRequests.sender",
                select: "name email photo phone",
            })
            .populate({
                path: "friends",
                select: "name email photo phone",
            });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User Fetched Successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                photo: user.photo,
                description: user.description,
                isVerified: user.isVerified,
            },
            friendRequests: user.friendRequests.map(request => ({
                _id: request._id,
                status: request.status,
                sender: request.sender ? {
                    _id: request.sender._id,
                    name: request.sender.name,
                    email: request.sender.email,
                    phone: request.sender.phone,
                    photo: request.sender.photo
                } : null
            })),
            friends: user.friends.map(friend => ({
                _id: friend._id,
                name: friend.name,
                email: friend.email,
                phone: friend.phone,
                photo: friend.photo
            })),
        });
    } catch (error) {
        res.status(500).json({
            message: "Something Went Wrong",
            error: error.message,
        });
    }
};
*/

export const fetchUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate({
                path: "friendRequests.sender",
                select: "name email photo phone",
            })
            .populate({
                path: "friends",
                select: "name email photo phone",
            });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const friendsWithMessages = await Promise.all(
            user.friends.map(async (friend) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { sender: user._id, receiver: friend._id },
                        { sender: friend._id, receiver: user._id },
                    ],
                })
                    .sort({ createdAt: -1 })
                    .select("messageContent createdAt")
                    .lean();

                return {
                    _id: friend._id,
                    name: friend.name,
                    email: friend.email,
                    phone: friend.phone,
                    photo: friend.photo,
                    lastMessage: lastMessage?.messageContent ? decrypt(lastMessage.messageContent) : null,
                    lastMessageTime: lastMessage?.createdAt || null,
                };
            })
        );

        res.status(200).json({
            message: "User Fetched Successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                photo: user.photo,
                description: user.description,
                isVerified: user.isVerified,
            },
            friendRequests: user.friendRequests.map((request) => ({
                _id: request._id,
                status: request.status,
                sender: request.sender
                    ? {
                        _id: request.sender._id,
                        name: request.sender.name,
                        email: request.sender.email,
                        phone: request.sender.phone,
                        photo: request.sender.photo,
                    }
                    : null,
            })),
            friends: friendsWithMessages,
        });
    } catch (error) {
        res.status(500).json({
            message: "Something Went Wrong",
            error: error.message,
        });
    }
};



export const getBlockedUsers = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).populate("blockedUsers", "phone photo description isVerified");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            blockedUsers: user.blockedUsers,
        });
    } catch (error) {
        console.error("Error fetching blocked users:", error);
        res.status(500).json({ message: "Server error" });
    }
};


export const FriendRequest = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;

        if (senderId == receiverId) { return res.status(400).json({ message: "Both sender and receiver are same person" }); }

        if (!senderId || !receiverId) {
            return res.status(400).json({ message: "Both sender and receiver IDs are required." });
        }

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) { return res.status(404).json({ message: "User not found." }); }

        const existingRequest = receiver.friendRequests.find(
            (req) => req.sender.toString() === sender._id.toString()
        );

        if (existingRequest) { return res.status(400).json({ message: "Friend request already sent." }); }

        receiver.friendRequests.push({ sender: sender._id, status: "pending" });
        await receiver.save();

        res.status(200).json({ message: "Friend request sent successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const UnFriendRequest = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;

        if (senderId == receiverId) { return res.status(400).json({ message: "Both sender and receiver are same person" }); }

        if (!senderId || !receiverId) {
            return res.status(400).json({ message: "Both sender and receiver IDs are required." });
        }

        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({ message: "Receiver not found." });
        }

        // Remove the friend request sent by senderId
        receiver.friendRequests = receiver.friendRequests.filter(
            (req) => req.sender.toString() !== senderId
        );

        await receiver.save();

        res.status(200).json({ message: "Friend request canceled successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}


export const GetUsers = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const perPage = 20;
        const { search, userId } = req.query;

        const query = {
            $and: [
                { _id: { $ne: userId } },
                { $or: [{ phone: { $regex: search, $options: "i" } }] }
            ]
        };

        const skip = (page - 1) * perPage;
        const data = await User.find(query)
            .select("name phone photo friends friendRequests")
            .populate("friends", "name phone photo")
            .populate("friendRequests.sender", "name phone photo")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .exec();

        res.json({
            status: true,
            message: "All Users Fetched Successfully",
            users: data
        });
    } catch (err) {
        console.error("Error fetching Users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};




export const HandleFriendRequests = async (req, res) => {
    try {
        const { action, userId, senderId } = req.body;
        console.log(action, userId, senderId);


        if (!userId || !senderId || !["accept", "reject"].includes(action)) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        const [user, sender] = await Promise.all([User.findById(userId), User.findById(senderId),]);




        if (!user || !sender) { return res.status(404).json({ message: "User or sender not found" }); }

        // Check if the friend request exists
        const friendRequest = user.friendRequests.find(
            (req) => req.sender.toString() === senderId && req.status === "pending"
        );

        if (!friendRequest) { return res.status(404).json({ message: "Friend request not found" }); }

        if (action === "accept") {
            // Ensure they are not already friends
            if (!user.friends.includes(senderId)) {
                await Promise.all([
                    User.findByIdAndUpdate(userId, { $push: { friends: senderId } }),
                    User.findByIdAndUpdate(senderId, { $push: { friends: userId } }),
                ]);
            }
        }

        // Remove the friend request from both users
        await User.findByIdAndUpdate(userId, { $pull: { friendRequests: { sender: senderId } }, });

        return res.json({ message: `Friend request ${action}ed successfully` });
    } catch (error) {
        console.error("Error processing friend request:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


export const getAllFriendRequests = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await User.findById(userId).populate("friendRequests.sender", "name email photo phone");

        if (!user) { return res.status(404).json({ message: "User not found" }); }


        res.status(200).json({ friendRequests: user.friendRequests });
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




export const uploadFile = async (req, res) => {
    const { userId, name, description, phone, email } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    try {
        let fileUrl = '';

        if (req.file) {
            const key = `${Date.now()}-${req.file.originalname}`;

            const uploadParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `uploads/${key}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
                ACL: "public-read",
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            fileUrl = `${process.env.R2_DEV_URL}${key}`;
        }

        const updateFields = {};
        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (phone) updateFields.phone = phone;
        if (email) updateFields.email = email;
        if (fileUrl) updateFields.photo = fileUrl;

        const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });
        if (!updatedUser) return res.status(404).json({ error: "User not found" });

        res.json({ user: updatedUser });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Upload failed" });
    }
};



export const getAllFriends = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) { return res.status(400).json({ message: "User ID is required" }); }

        const user = await User.findById(userId).populate("friends", "name photo phone");

        if (!user) { return res.status(404).json({ message: "User not found" }); }

        res.status(200).json({ friends: user.friends });
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) { return res.status(404).json({ message: "User not found" }); }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
    }
};





export const clearAllFriendsAndRequests = async (req, res) => {
    try {
        // Set friends and friendRequests to empty arrays for all users
        await User.updateMany({}, {
            $set: {
                friends: [],
                friendRequests: []
            }
        });

        res.status(200).json({ message: "All friends and friend requests cleared for all users." });
    } catch (error) {
        console.error("Error clearing friends and friend requests:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};