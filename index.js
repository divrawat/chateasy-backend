import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import group from "./routes/group.js";
import message from './routes/message.js';
import user from './routes/user.js';
// import socketController from "./controllers/socketController.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "DELETE", "PUT"]
    }
});

app.set("io", io);

app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());

app.use('/api', group);
app.use('/api', message);
app.use('/api', user);


mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));





// socketController(io);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
