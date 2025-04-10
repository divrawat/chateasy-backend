import express from "express";
const router = express.Router();

import {
    sendOTP, verifyOTP, getBlockedUsers, fetchUser, GetUsers, FriendRequest, HandleFriendRequests, UnFriendRequest, getAllFriendRequests,
    upload, uploadFile, getAllFriends, clearAllFriendsAndRequests
} from "../controllers/user.js"


router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/friend-request", FriendRequest);
router.post("/unfriend-request", UnFriendRequest);
router.post("/handle-friend-request/:sendersId", HandleFriendRequests);

router.post("/upload", upload.single("file"), uploadFile)

router.get("/search-users", GetUsers);
router.get("/friend-requests/:userId", getAllFriendRequests);
router.get("/all-friends/:userId", getAllFriends);
router.get("/user/:userId", fetchUser);
router.get("/user/:userId/blocked", getBlockedUsers);



router.post('/update-token', async (req, res) => {
    const { userId, expoPushToken } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { expoPushToken });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


router.get("/clear-friends-and-requests", clearAllFriendsAndRequests);


export default router;