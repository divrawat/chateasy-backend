import Message from "../models/message.js";
import Group from "../models/group.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid";
import User from '../models/user.js'

import multer from 'multer';
export const myupload = multer({});

const storage = multer.memoryStorage()
export const upload = multer({ storage });

const s3Client = new S3Client({
    region: process.env.R2_REGION,
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});




export const sendMessage = async (req, res) => {
    try {
        const { sender, receiver, group, messageContent: bodyMessageContent } = req.body;

        const files = req.files;
        let messageContent = [];

        if (files && files.length > 0) {
            for (const file of files) {
                const fileExt = file.originalname.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;

                const uploadParams = {
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);

                const mediaUrl = `${process.env.R2_DEV_URL_MESSAGE}/${fileName}`;
                messageContent.push(mediaUrl);
            }
        } else {
            messageContent = bodyMessageContent || '';
        }

        const newMessage = new Message({
            sender,
            receiver: receiver || null,
            group: group || null,
            type: files?.length ? 'file' : 'text',
            messageContent,
        });

        await newMessage.save();
        const messageObj = newMessage.toObject();

        const io = req.app.get('io');
        const roomId = `chat_${[sender, receiver].sort().join('_')}`;

        if (group) {
            io.to(`group_${group}`).emit("receiveGroupMessage", messageObj);
        } else if (receiver) {
            io.to(roomId).emit("receiveMessage", { ...messageObj, roomId, });
        }


        res.status(201).json({ success: true, message: messageObj });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



export const deleteMessage = async (req, res) => {
    try {
        const { messageId, sender } = req.body;


        if (!messageId) { return res.status(400).json({ success: false, message: "Message ID is required" }); }

        const message = await Message.findById(messageId);
        if (!message) { return res.status(404).json({ success: false, error: "Message not found" }); }

        // console.log("Message Sender", message.sender.toString());
        // console.log("Sender", sender);


        if (message.sender.toString() !== sender) { return res.status(400).json({ success: false, error: "You can only delete your messages" }); }


        message.isDeleted = true;
        await message.save();

        return res.status(200).json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
        console.error("Error deleting message:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};



export const getMessages = async (req, res) => {
    try {
        const { sender, receiver, group } = req.query;

        let messages;

        if (group) {
            messages = await Message.find({ group }).sort({ createdAt: 1 });
        } else if (sender && receiver) {
            messages = await Message.find({
                $or: [
                    { sender, receiver },
                    { sender: receiver, receiver: sender }
                ]
            }).sort({ createdAt: 1 });
        } else {
            return res.status(400).json({ message: "Invalid parameters: sender, receiver, or group required" });
        }

        messages = messages.map(msg => msg.toObject());



        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const markMessagesAsRead = async (req, res) => {
    const { senderId, receiverId, groupId } = req.body;

    try {
        const query = {
            sender: senderId,
            receiver: receiverId,
            isRead: false
        };

        if (groupId) { query.group = groupId; }

        const result = await Message.updateMany(query, { $set: { isRead: true } });
        return res.status(200).json({ success: true, updated: result.nModified });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}



export const MessagesAsRead = async (req, res) => {
    const { messageId } = req.body;

    try {
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { isRead: true },
            { new: true }
        );

        const io = req.app.get('io');

        const { sender, receiver, group } = updatedMessage;


        const roomId = `chat_${[sender, receiver].sort().join('_')}`;
        io.to(roomId).emit('messageMarkedAsRead', updatedMessage);

        return res.status(200).json({ success: true, updatedMessage });
    } catch (error) {
        console.error('Error marking message as read:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


export const markMultipleMessagesAsRead = async (req, res) => {
    const { messageIds, senderId, receiverId } = req.body;

    try {

        const result = await Message.updateMany(
            { _id: { $in: messageIds }, isRead: false },
            { $set: { isRead: true } }
        );

        const io = req.app.get('io');
        const roomId = `chat_${[senderId, receiverId].sort().join('_')}`;
        io.to(roomId).emit('markMultipleMessagesAsRead', { ids: messageIds });

        res.status(200).json({ success: true, updatedCount: result.modifiedCount || result.nModified });
    } catch (error) {
        console.error("Error marking multiple messages as read:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};


