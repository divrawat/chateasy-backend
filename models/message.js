import mongoose from "mongoose";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

const encrypt = (text) => {
    if (!text || typeof text !== "string") return text; // Ensure valid input
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");
        return `${iv.toString("hex")}:${encrypted}`;
    } catch (error) {
        console.error("Encryption failed:", error);
        return text;
    }
};


const decrypt = (text) => {
    if (!text || typeof text !== "string") return text; // Ensure valid input
    try {
        const [ivHex, encryptedText] = text.split(":");
        if (!ivHex || !encryptedText) return text; // Avoid crashes if format is incorrect
        const iv = Buffer.from(ivHex, "hex");
        const encryptedBuffer = Buffer.from(encryptedText, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedBuffer, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error);
        return text; // Return encrypted text if decryption fails
    }
};



const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () {
            return !this.group;
        }
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: function () {
            return !this.receiver;
        }
    },
    type: {
        type: String,
        enum: ["text", "image", "video", "audio", "file", "gif", 'document'],
        default: "text"
    },
    messageContent: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        set: encrypt,
        get: decrypt
    },
    mediaUrl: {
        type: String,
        set: encrypt,
        get: decrypt
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

export default mongoose.model("Message", MessageSchema);
