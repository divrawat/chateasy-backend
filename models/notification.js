import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model("Notification", NotificationSchema);
