import express from "express";
const router = express.Router();

import { sendOTP, verifyOTP, getBlockedUsers, fetchUser } from "../controllers/user.js"


router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.get("/user/:userId", fetchUser);
router.get("/user/:userId/blocked", getBlockedUsers);


export default router;