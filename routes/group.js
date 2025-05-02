import express from "express";
import { createGroup, deleteGroup, addGroupMembers, removeGroupMembers, leaveGroup, myupload, update, addAdmins, removeAdmins } from "../controllers/group.js";
import multer from 'multer';
const upload = multer();
const router = express.Router();

router.post("/group/create", myupload.single("file"), createGroup);
router.delete("/group/delete-group", deleteGroup);

router.post("/group/update", upload.single("file"), update)

router.post('/group/add-members', upload.none(), addGroupMembers);

router.post('/group/add-admins', upload.none(), addAdmins);
router.post('/group/remove-admins', upload.none(), removeAdmins);


router.post('/group/remove-members', upload.none(), removeGroupMembers);

router.post("/group/leave-group", leaveGroup);

export default router;
