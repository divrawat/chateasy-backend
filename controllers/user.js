import dotenv from "dotenv";
import User from "../models/user.js";
import nodemailer from 'nodemailer';
import jwt from "jsonwebtoken";
dotenv.config();


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

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.otp || user.otp !== otp || user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Mark user as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        // Generate JWT token valid for 10 days
        const token = jwt.sign(
            { userId: user._id, phone: user.phone },
            process.env.JWT_SECRET,
            { expiresIn: "10d" }
        );

        res.status(200).json({ message: "OTP verified successfully", token });

    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
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




