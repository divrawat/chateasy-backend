import express from "express";
const router = express.Router();
import User from '../models/user.js'

import {
    sendOTP, verifyOTP, getBlockedUsers, fetchUser, GetUsers, FriendRequest, HandleFriendRequests, UnFriendRequest, getAllFriendRequests,
    upload, uploadFile, getAllFriends, clearAllFriendsAndRequests, blockFriend, unblockFriend, muteFriend, unmuteUser
} from "../controllers/user.js"


router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/friend-request", FriendRequest);
router.post("/unfriend-request", UnFriendRequest);
router.post("/handle-friend-request/:sendersId", HandleFriendRequests);

router.post("/block-friend", blockFriend);
router.post("/unblock-friend", unblockFriend);

router.post("/upload", upload.single("file"), uploadFile)

router.get("/search-users", GetUsers);
router.get("/friend-requests/:userId", getAllFriendRequests);
router.get("/all-friends/:userId", getAllFriends);
router.get("/user/:userId", fetchUser);
router.get("/user/:userId/blocked", getBlockedUsers);

router.post("/mute-friend", muteFriend);
router.post("/unmute-friend", unmuteUser);


router.get("/clear-friends-and-requests", clearAllFriendsAndRequests);


export default router;