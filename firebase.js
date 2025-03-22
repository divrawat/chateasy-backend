import admin from "firebase-admin";
import dotenv from "dotenv";
import serviceAccount from "./firebase-service-account.json"; // Your Firebase private key JSON

dotenv.config();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;
