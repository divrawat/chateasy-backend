import Message from "../models/message.js";
import Group from "../models/group.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid";
import { sendPushNotification } from "./notification.js";
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


/*
export const sendMessage = async (req, res) => {
    try {
        console.log(req.body);

        const { sender, receiver, group, messageType, messageContent, mediaUrl } = req.body;

        const newMessage = new Message({
            sender,
            receiver: receiver || null,
            group: group || null,
            messageType,
            messageContent,
            mediaUrl
        });

        await newMessage.save();


        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
*/

/*
export const sendMessage = async (req, res) => {
    try {
        const { sender, receiver, group, messageType, messageContent } = req.body;
        const files = req.files;

        console.log("Incoming body:", req.body);

        let mediaUrls = [];

        if (files && files.length > 0) {
            for (const file of files) {
                const fileExt = file.originalname.split(".").pop();
                const fileName = `${uuidv4()}.${fileExt}`;

                const uploadParams = {
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);

                const mediaUrl = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;
                mediaUrls.push({
                    url: mediaUrl,
                    name: file.originalname,
                    type: file.mimetype,
                });
            }
        }

        const newMessage = new Message({
            sender,
            receiver: receiver || null,
            group: group || null,
            messageType: files?.length ? "file" : "text",
            messageContent: files?.length ? "" : messageContent,
            mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        });

        await newMessage.save();

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
*/

/*
export const sendMessage = async (req, res) => {
    try {
        const { sender, receiver, group, messageType } = req.body;
        console.log(req.body);

        const files = req.files;
        console.log('length: ', files.length);



        let messageContent = [];

        if (files && files.length > 0) {
            for (const file of files) {
                const fileExt = file.originalname.split(".").pop();
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
                // console.log('00000000000', mediaUrl);

                messageContent.push(mediaUrl);
            }
        }

        if (!files || files.length === 0) {
            messageContent = req.body.messageContent || "";
        }

        const newMessage = new Message({
            sender,
            receiver: receiver || null,
            group: group || null,
            type: files?.length ? "file" : "text",
            messageContent,
        });

        await newMessage.save();

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
*/

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

        const recipient = await User.findById(receiver);
        const pushToken = recipient?.expoPushToken;

        if (pushToken) {
            await sendPushNotification(
                pushToken,
                'New Message',
                files?.length ? '📎 Media message received' : messageContent.slice(0, 100),
                { messageId: newMessage._id }
            );
        }

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body;
        const io = req.app.get("io");

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        let isAuthorized = false;

        if (message.group) {
            const group = await Group.findById(message.group);
            if (!group) {
                return res.status(404).json({ message: "Group not found" });
            }
            const isAdmin = group.admins.some(admin => admin.toString() === userId);
            const isSender = message.sender.toString() === userId;
            isAuthorized = isAdmin || isSender;
        } else {
            isAuthorized = message.sender.toString() === userId;
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: "Unauthorized to delete this message" });
        }

        await Message.findByIdAndDelete(messageId);

        io.emit("messageDeleted", { messageId });

        res.status(200).json({ message: "Message deleted successfully", messageId });
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



export const getMessages = async (req, res) => {
    try {
        const { sender, receiver, group } = req.query;
        const io = req.app.get("io");

        if (!io) {
            console.error("Socket.io not initialized");
            return res.status(500).json({ message: "Internal server error" });
        }

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

        if (group) {
            io.to(group).emit("loadMessages", messages);
        } else {
            if (sender) io.to(sender).emit("loadMessages", messages);
            if (receiver) io.to(receiver).emit("loadMessages", messages);
        }

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