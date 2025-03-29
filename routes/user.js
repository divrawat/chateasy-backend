import express from "express";
const router = express.Router();

import { sendOTP, verifyOTP, getBlockedUsers, fetchUser, GetUsers, FriendRequest, HandleFriendRequests, UnFriendRequest, getAllFriendRequests } from "../controllers/user.js"


router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

router.post("/friend-request", FriendRequest);
router.post("/unfriend-request", UnFriendRequest);
router.post("/handle-friend-request/:sendersId", HandleFriendRequests);
router.get("/search-users", GetUsers);
router.get("/friend-requests/:userId", getAllFriendRequests);

router.get("/user/:userId", fetchUser);
router.get("/user/:userId/blocked", getBlockedUsers);


export default router;