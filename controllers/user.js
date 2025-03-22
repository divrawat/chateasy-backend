import dotenv from "dotenv";
import User from "../models/user.js";
import axios from "axios";
import nodemailer from 'nodemailer';
dotenv.config();


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use TLS
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


export const sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;


        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Find or create user
        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({ phone, otp, otpExpiresAt });
        } else {
            user.otp = otp;
            user.otpExpiresAt = otpExpiresAt;
        }
        await user.save();

        // Send OTP via email
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
        console.log(error);


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

        // OTP is valid, update user status
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




