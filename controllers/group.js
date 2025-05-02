import Group from "../models/group.js";
import Message from '../models/message.js'
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import User from '../models/user.js'
import multer from "multer";

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



export const createGroup = async (req, res) => {
    try {
        const { name, description, creator, isPrivate } = req.body;

        var fileUrl = '';

        if (req.file) {
            const key = `${Date.now()}-${req.file.originalname}`;

            const uploadParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
                ACL: "public-read",
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            fileUrl = `${process.env.R2_DEV_URL_MESSAGE}/${key}`;
        }


        const newgroup = new Group({ name, description, photo: fileUrl, creator, members: [creator] });
        await newgroup.save();
        await User.findByIdAndUpdate(creator, { $addToSet: { groups: newgroup._id } });

        res.status(201).json({ message: 'Group Created SuccessFully', newgroup });
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



/*
export const deleteGroup = async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) { return res.status(404).json({ message: "Group not found" }); }

        if (group.creator.toString() !== userId) {
            return res.status(403).json({ message: "Only the creator can delete this group" });
        }

        await Group.findByIdAndDelete(groupId);

        res.status(200).json({ message: "Group deleted successfully", groupId });
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
*/

export const deleteGroup = async (req, res) => {
    try {
        const { groupId, userId } = req.body;

        if (!groupId || !userId) {
            return res.status(400).json({ error: 'Group ID and User ID are required' });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.creator.toString() !== userId) {
            return res.status(403).json({ error: 'You are not the creator of this group' });
        }

        const userIds = [...group.admins, ...group.members];

        // Remove groupId from each user's groups array
        await User.updateMany(
            { _id: { $in: userIds } },
            { $pull: { groups: groupId } }
        );

        // Delete all messages related to this group
        await Message.deleteMany({ group: groupId });

        // Delete the group
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({ message: 'Group and associated messages deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/*
export const addGroupMembers = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const userIds = req.body['userIds[]'] || req.body.userIds;
        const currentUserId = userId;


        if (!groupId || !userIds) {
            return res.status(400).json({ message: 'Missing groupId or userIds' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isAdminOrCreator = group.creator.toString() === currentUserId || group.admins.includes(currentUserId);
        if (!isAdminOrCreator) {
            return res.status(403).json({ message: 'You do not have permission to add members to this group' });
        }

        const ids = Array.isArray(userIds) ? userIds : [userIds];

        // Add each user to the group if not already a member
        const addedMembers = [];
        for (const id of ids) {
            if (!group.members.includes(id)) {
                group.members.push(id);
                // Add the group ID to the user's groups array
                const user = await User.findById(id);
                if (user) {
                    user.groups.push(groupId);
                    await user.save();
                    addedMembers.push(user);
                }
            }
        }

        await group.save();
        res.json({ message: 'Members added successfully', members: group.members, addedMembers });
    } catch (error) {
        console.error('Add Members Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
*/

export const addGroupMembers = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const userIds = req.body['userIds[]'] || req.body.userIds;
        const currentUserId = userId;

        if (!groupId || !userIds) { return res.status(400).json({ message: 'Missing groupId or userIds' }); }

        const group = await Group.findById(groupId);
        if (!group) { return res.status(404).json({ message: 'Group not found' }); }

        const isAdminOrCreator = group.creator.toString() === currentUserId || group.admins.includes(currentUserId);
        if (!isAdminOrCreator) {
            return res.status(403).json({ message: 'You do not have permission to add members to this group' });
        }

        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const addedMembers = [];
        const groupmembers = [];

        const admin = await User.findById(userId);

        for (const id of ids) {
            const isAlreadyMember = group.members.includes(id);

            const leftUserIndex = group.leftUsers.findIndex(
                (entry) => entry.user.toString() === id
            );
            if (leftUserIndex !== -1) { group.leftUsers.splice(leftUserIndex, 1); }

            if (!isAlreadyMember) { group.members.push(id); }

            const user = await User.findById(id);
            if (user) {
                if (!user.groups.includes(groupId)) {
                    user.groups.push(groupId);
                }
                await user.save();
                addedMembers.push(user);
                groupmembers.push(user._id)
            }

            const io = req.app.get('io');
            const systemMessage = new Message({
                group: groupId,
                messageContent: `${user.name} was added by ${admin.name}`,
                type: "system"
            });

            await systemMessage.save();
            io.to(`group_${groupId}`).emit("receiveGroupMessage", systemMessage);

        }

        await group.save();

        const io = req.app.get('io');
        const memberDetails = await User.find({ _id: { $in: group.members } })
        for (const id of ids) {
            io.to(id).emit("addedToGroup", {
                _id: group._id,
                name: group.name,
                members: memberDetails,
                // members: groupmembers,
                createdAt: group.createdAt,
                photo: group.photo,
                creator: group.creator
            });
        }

        res.json({
            message: 'Members added successfully',
            members: group.members,
            addedMembers
        });

    } catch (error) {
        console.error('Add Members Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};




export const addAdmins = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const userIds = req.body['userIds[]'] || req.body.userIds;
        const currentUserId = userId;


        if (!groupId || !userIds) {
            return res.status(400).json({ error: 'Missing groupId or userIds' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.creator.toString() !== currentUserId.toString()) {
            return res.status(403).json({ error: 'Only Group Creator can make anyone Admin' });
        }

        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const addedAdmins = [];

        ids.forEach((id) => {
            const idStr = id.toString();

            // Only add if not already in admins and not creator
            if (
                idStr !== group.creator.toString() &&
                !group.admins.some(a => a.toString() === idStr)
            ) {
                group.admins.push(idStr);
                addedAdmins.push(idStr);
            }
        });

        await group.save();

        return res.json({
            message: 'Admins added successfully',
            admins: group.admins,
            addedAdmins
        });

    } catch (error) {
        console.error('Add Admins Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};






export const removeGroupMembers = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const userIds = req.body['userIds[]'] || req.body.userIds;
        const currentUserId = userId;

        if (!groupId || !userIds) { return res.status(400).json({ message: 'Missing groupId or userIds' }); }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Check if the current user is the creator or an admin of the group
        const isAdminOrCreator = group.creator.toString() === currentUserId || group.admins.includes(currentUserId);
        if (!isAdminOrCreator) {
            return res.status(403).json({ message: 'You do not have permission to remove members from this group' });
        }

        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const removedMembers = [];

        for (const id of ids) {
            if (group.members.includes(id)) {
                // Remove member from the group members and admins (if applicable)
                group.members = group.members.filter(member => member.toString() !== id);
                group.admins = group.admins.filter(admin => admin.toString() !== id);

                // Optionally store removed users
                const user = await User.findById(id);
                if (user) {
                    removedMembers.push(user);
                    group.leftUsers.push({ user: id, leftAt: new Date() });
                    const io = req.app.get('io');
                    io.to(`group_${groupId}`).emit("groupUpdated", {
                        groupId, type: "leave", user: { _id: id, }, leftAt: new Date(),
                    });
                }
            }
        }


        await group.save();

        const io = req.app.get('io');


        const memberDetails = await User.find({ _id: { $in: group.members } })
        /*
        for (const id of ids) {
            io.to(id).emit("RemovedFromGroup", {
                _id: group._id,
                name: group.name,
                members: memberDetails,
                createdAt: group.createdAt,
                photo: group.photo,
                creator: group.creator
            });
        }
            */



        const removingUser = await User.findById(currentUserId);

        for (const id of ids) {
            const removedUser = await User.findById(id);
            if (!removedUser) continue;

            const systemMessage = new Message({
                group: group._id,
                messageContent: `${removedUser.name} was removed by ${removingUser.name}`,
                type: "system"
            });

            await systemMessage.save();

            io.to(`group_${group._id}`).emit("receiveGroupMessage", systemMessage);

            io.to(id).emit("RemovedFromGroup", {
                _id: group._id,
                name: group.name,
                members: memberDetails,
                createdAt: group.createdAt,
                photo: group.photo,
                creator: group.creator
            });
        }







        res.json({ message: 'Members removed successfully', members: group.members, removedMembers });
    } catch (error) {
        console.error('Remove Members Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};




export const removeAdmins = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const userIds = req.body['userIds[]'] || req.body.userIds;
        const currentUserId = userId;

        // console.log(userIds);


        if (!groupId || !userIds) {
            return res.status(400).json({ error: 'Missing groupId or userIds' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.creator.toString() !== currentUserId.toString()) {
            return res.status(403).json({ error: 'Only Group Creator can remove Admins' });
        }

        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const removedAdmins = [];

        ids.forEach((id) => {
            const idStr = id.toString();

            if (
                idStr !== group.creator.toString() &&
                group.admins.some(a => a.toString() === idStr)
            ) {
                group.admins = group.admins.filter(a => a.toString() !== idStr);
                removedAdmins.push(idStr);
            }
        });

        await group.save();

        return res.json({
            message: 'Admins removed successfully',
            admins: group.admins,
            removedAdmins
        });

    } catch (error) {
        console.error('Remove Admins Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};





export const leaveGroup = async (req, res) => {
    try {
        const { groupId, userId } = req.body;

        if (!groupId || !userId) {
            return res.status(400).json({ error: 'Group ID and User ID are required' });
        }

        const group = await Group.findById(groupId);

        if (!group) { return res.status(404).json({ error: 'Group not found' }); }


        group.members = group.members.filter(id => id.toString() !== userId);
        group.admins = group.admins.filter(id => id.toString() !== userId);


        group.leftUsers.push({ user: userId, leftAt: new Date() });

        await group.save();

        const io = req.app.get('io');
        io.to(`group_${groupId}`).emit("groupUpdated", {
            groupId, type: "leave", user: { _id: userId, }, leftAt: new Date(),
        });



        return res.status(200).json({ message: 'Left group successfully' });
    } catch (error) {
        console.error('Error leaving group:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

















export const update = async (req, res) => {
    const { userId, groupId, groupName, groupdescription } = req.body;


    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (!groupId) return res.status(400).json({ error: "Group ID is required" });

    try {
        var fileUrl = '';

        if (req.file) {
            const key = `${Date.now()}-${req.file.originalname}`;

            const uploadParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `${key}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
                ACL: "public-read",
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            fileUrl = `${process.env.R2_DEV_URL_MESSAGE}/${key}`;
        }

        const updateFields = {};
        if (groupName) updateFields.name = groupName;
        if (groupdescription) updateFields.description = groupdescription;
        if (fileUrl) updateFields.photo = fileUrl;

        const updatedGroup = await Group.findByIdAndUpdate(groupId, updateFields, { new: true });
        if (!updatedGroup) return res.status(404).json({ error: "Group not found" });

        res.json({ message: 'Group Updated', group: updatedGroup });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Upload failed" });
    }
};