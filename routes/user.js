import express from "express";
const router = express.Router();

import { sendOTP, verifyOTP, getBlockedUsers } from "../controllers/user.js"


router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.get("/users/:userId/blocked", getBlockedUsers);


export default router;