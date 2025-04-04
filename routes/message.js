import express from "express";
import { sendMessage, deleteMessage, getMessages } from "../controllers/message.js";

const router = express.Router();


router.post("/send", sendMessage);

router.get("/get-messages", getMessages);

router.delete("/delete/:messageId/:userId", deleteMessage);

export default router;
