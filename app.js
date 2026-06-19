import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import express from "express";
import { connectDb } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { createUser } from "./seeders/user.seed.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
// import { NEW_MESSAGE, NEW_MESSAGE_ALERT } from "./constants/event.js";
import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  NEW_REQUEST,
  STOP_TYPING,
  START_TYPING
} from "./constants/event.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.model.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { corsOptions } from "./constants/config.js";

import adminRoute from "./routes/admin.routes.js";
import userRoute from "./routes/user.routes.js";
import chatRoute from "./routes/chat.routes.js";

const MONGO_URI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY;
const userSocketIDs = new Map(); //all active users

connectDb(MONGO_URI);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


const app = express();
const server = createServer(app);
const io = new Server(server, { cors: corsOptions });
//using middlewares here

app.use(express.json()); //to access json data
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

app.set("io",io)
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, resp) => {
  resp.send("hello........");
});

// socket middleware for auth
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

io.on("connection", (socket) => {

  const user = socket.user;
 

  userSocketIDs.set(user._id.toString(), socket.id);

  //not working i think
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
   
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toString(),
    };
    const messageForDb = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    

console.log("Emitting",messageForRealTime);


    //jinko msg send krna h ve
    const memberSockets = getSockets(members);

    io.to(memberSockets).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(memberSockets).emit(NEW_MESSAGE_ALERT, { chatId });

    // console.log("NEW_MESSAGE", messageForRealTime);
    try {
      await Message.create(messageForDb);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(START_TYPING,({members,chatId})=>{
    // console.log("START typing");

    const memberSocket=getSockets(members);
    socket.to(memberSocket).emit(START_TYPING,{chatId})
    
  })

  
  socket.on(STOP_TYPING,({members,chatId})=>{
    // console.log("STOP typing");

    const memberSocket=getSockets(members);
    socket.to(memberSocket).emit(STOP_TYPING,{chatId})
    
  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userSocketIDs.delete(user._id.toString());
  });
});

app.use(errorMiddleware);

server.listen(port, () => {
  console.log(
    `server is running on port http://localhost:${port} in ${envMode} mode`,
  );
});

export { adminSecretKey, envMode, userSocketIDs };
