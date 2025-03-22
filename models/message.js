import mongoose from "mongoose";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

const encrypt = (text) => {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
};


const decrypt = (text) => {
    if (!text) return text;
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
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
    messageType: {
        type: String,
        enum: ["text", "image", "video", "audio", "file", "gif"],
        default: "text"
    },
    messageContent: {
        type: String,
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
