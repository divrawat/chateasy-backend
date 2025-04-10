import express from "express";
import { sendMessage, deleteMessage, getMessages, markMessagesAsRead, myupload } from "../controllers/message.js";

const router = express.Router();


// router.post("/send", sendMessage);
router.post("/send", myupload.array("files"), sendMessage);

router.post("/mark-read", markMessagesAsRead);

router.get("/get-messages", getMessages);

router.delete("/delete/:messageId/:userId", deleteMessage);

export default router;
