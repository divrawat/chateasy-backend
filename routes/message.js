import express from "express";
import { sendMessage, deleteMessage } from "../controllers/message.js";

const router = express.Router();


router.post("/send", sendMessage);
router.delete("/delete/:messageId/:userId", deleteMessage);

export default router;
