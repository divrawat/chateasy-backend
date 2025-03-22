import express from "express";
import { createGroup, deleteGroup, addUserToGroup, removeUserFromGroup, leaveGroup } from "../controllers/group.js";

const router = express.Router();

router.post("/create", createGroup);
router.delete("/delete/:groupId/:userId", deleteGroup);
router.post("/addUser", addUserToGroup);
router.post("/removeUser", removeUserFromGroup);
router.post("/leaveGroup", leaveGroup);

export default router;
