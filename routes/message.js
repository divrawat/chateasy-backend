import express from "express";
import { sendMessage, deleteMessage, getMessages, markMessagesAsRead, myupload, MessagesAsRead, markMultipleMessagesAsRead } from "../controllers/message.js";

const router = express.Router();


// router.post("/send", sendMessage);
router.post("/send", myupload.array("files"), sendMessage);

router.post("/mark-read", markMessagesAsRead);
router.post("/message-read", MessagesAsRead);

router.post("/markMessageAsRead", MessagesAsRead);



router.post("/markMultipleMessagesAsRead", markMultipleMessagesAsRead);
router.get("/get-messages", getMessages);
router.delete("/delete-message", deleteMessage);

export default router;
