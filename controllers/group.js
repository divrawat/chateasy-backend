import Group from "../models/group.js";

export const createGroup = async (req, res) => {
    try {
        const { name, description, photo, creator, admins, members, isPrivate } = req.body;

        if (!members.includes(creator)) {
            members.push(creator);
        }

        const newGroup = new Group({
            name,
            description,
            photo,
            creator,
            admins: admins.length > 0 ? admins : [creator],
            members,
            isPrivate: isPrivate || false
        });

        await newGroup.save();

        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Only allow deletion if the requester is the creator
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



export const addUserToGroup = async (req, res) => {
    try {
        const { groupId, userId, adminId } = req.body; // adminId = the person making the request

        // Fetch group details
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if the requester is the creator or an admin
        const isCreator = group.creator.toString() === adminId;
        const isAdmin = group.admins.some(admin => admin.toString() === adminId);

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: "Only the creator or an admin can add users" });
        }

        // Check if user is already in the group
        if (group.members.includes(userId)) {
            return res.status(400).json({ message: "User is already in the group" });
        }

        // Add user to group
        group.members.push(userId);
        await group.save();

        res.status(200).json({ message: "User added successfully", group });
    } catch (error) {
        console.error("Error adding user to group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



export const removeUserFromGroup = async (req, res) => {
    const { groupId, userId, adminId } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if the adminId is the creator or an admin
        const isAdmin = group.creator.toString() === adminId || group.admins.includes(adminId);
        if (!isAdmin) {
            return res.status(403).json({ message: "Only the creator or an admin can remove users" });
        }

        // Ensure the user is actually a member
        if (!group.members.includes(userId)) {
            return res.status(400).json({ message: "User is not a member of this group" });
        }

        // Remove user from the group members array
        group.members = group.members.filter(member => member.toString() !== userId);

        // Remove from admin list if the user is an admin
        group.admins = group.admins.filter(admin => admin.toString() !== userId);

        await group.save();

        res.status(200).json({ message: "User removed from group successfully" });
    } catch (error) {
        console.error("Error removing user from group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



export const leaveGroup = async (req, res) => {
    const { groupId, userId } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Ensure the user is actually a member
        if (!group.members.includes(userId)) {
            return res.status(400).json({ message: "You are not a member of this group" });
        }

        // Prevent the creator from leaving
        if (group.creator.toString() === userId) {
            return res.status(403).json({ message: "The creator cannot leave the group" });
        }

        // Remove user from the group members array
        group.members = group.members.filter(member => member.toString() !== userId);

        // Remove from admin list if the user is an admin
        group.admins = group.admins.filter(admin => admin.toString() !== userId);

        await group.save();

        res.status(200).json({ message: "You have left the group successfully" });
    } catch (error) {
        console.error("Error leaving group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};