import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    photo: {
        type: String,
    },
    description: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    mutedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    mutedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    }],
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    friendRequests: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending"
        }
    }],
    otp: {
        type: String
    },
    otpExpiresAt: {
        type: Date
    },
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
