import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    photo: {
        type: String,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    mutedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    isPrivate: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model("Group", GroupSchema);
