import dotenv from "dotenv";
import User from "../models/user.js";
import nodemailer from 'nodemailer';
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
        const { email, phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // Find user by phone number
        let user = await User.findOne({ phone });

        // Generate OTP and expiration time
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        if (!user) {
            // Signup: User doesn't exist, create a new one
            if (!email) {
                return res.status(400).json({ message: "Email is required for signup" });
            }
            user = new User({ email, phone, otp, otpExpiresAt });
        } else {
            // Login: User exists, retrieve the stored email
            email = user.email; // Pick email from database
            if (!email) {
                return res.status(500).json({ message: "Email not found for this phone number" });
            }
            user.otp = otp;
            user.otpExpiresAt = otpExpiresAt;
        }

        await user.save();

        // Send OTP to the correct email
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email, // Now always has a value (either provided or fetched)
            subject: "Your OTP Code",
            text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP sent successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};






// Verify OTP
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

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        res.status(200).json({ message: "OTP verified successfully" });

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




