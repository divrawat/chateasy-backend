import Message from "../models/message.js";
import Group from "../models/group.js";
import Notification from "../models/notification.js";

export const sendMessage = async (req, res) => {
    try {
        const { sender, receiver, group, messageType, messageContent } = req.body;
        const io = req.app.get("io");

        if (!io) {
            console.error("Socket.io not initialized");
            return res.status(500).json({ message: "Internal server error" });
        }

        const newMessage = new Message({
            sender,
            receiver,
            group,
            messageType,
            messageContent,
        });

        await newMessage.save();

        // Convert to object before emitting
        const messageData = newMessage.toObject();

        if (group) {
            io.to(group).emit("loadMessages", [messageData]);
        } else {
            io.to(sender).emit("loadMessages", [messageData]);
            io.to(receiver).emit("loadMessages", [messageData]);
        }

        res.status(201).json(messageData);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error" });
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


