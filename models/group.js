import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: true
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
    }],
    leftUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        leftAt: {
            type: Date,
            default: Date.now
        }
    }],
}, { timestamps: true });

export default mongoose.model("Group", GroupSchema);
