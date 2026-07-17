
import express from "express";
import { connectDb } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
  REQUEST_UNREAD_ALERTS,
} from "./constants/event.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.model.js";
import { Notification } from "./models/notification.model.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

import userRoute from "./routes/user.routes.js";
import chatRoute from "./routes/chat.routes.js";
import adminRoute from "./routes/admin.routes.js";

dotenv.config({
  path: "./.env",
});

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";
const userSocketIDs = new Map();
const onlineUsers = new Set();

connectDb(mongoURI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// Using Middlewares Here
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello World");
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});




io.on("connection", async (socket) => {
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);

  console.log("Connected:", user.name);

  // Emit stored unread alerts
  try {
    const unread = await Notification.aggregate([
      {
        $match: {
          receiver: new mongoose.Types.ObjectId(user._id),
          type: "message",
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$chat",
          count: { $sum: 1 },
        },
      },
    ]);

    unread.forEach((u) => {
      socket.emit(NEW_MESSAGE_ALERT, {
        chatId: u._id.toString(),
        count: u.count,
      });
    });

    console.log("Unread alerts sent");
  } catch (err) {
    console.log("Error fetching unread alerts");
  }

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    console.log("New message:", chatId);

    const memberIds = Array.isArray(members)
      ? members.map((m) => (m && m._id ? String(m._id) : String(m)))
      : [];

    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membersSockets = getSockets(memberIds);

    membersSockets.forEach((sid) => {
      io.to(sid).emit(NEW_MESSAGE, {
        chatId,
        message: messageForRealTime,
      });

      io.to(sid).emit(NEW_MESSAGE_ALERT, { chatId });
    });

    try {
      await Message.create(messageForDB);
      console.log("Message saved");
    } catch (error) {
      console.log("Error saving message");
    }

    try {
      for (const memberId of memberIds) {
        if (String(memberId) === String(user._id)) continue;

        await Notification.create({
          sender: user._id,
          receiver: memberId,
          type: "message",
          chat: chatId,
        });

        console.log("Notification created for:", memberId);
      }
    } catch (err) {
      console.log("Error creating notifications");
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);

    membersSockets.forEach((sid) => {
      if (sid === socket.id) return;

      socket.to(sid).emit(START_TYPING, { chatId });
    });
  });

  socket.on(REQUEST_UNREAD_ALERTS, async () => {
    console.log("Unread alerts requested");

    try {
      const unread = await Notification.aggregate([
        {
          $match: {
            receiver: new mongoose.Types.ObjectId(user._id),
            type: "message",
            isRead: false,
          },
        },
        {
          $group: {
            _id: "$chat",
            count: { $sum: 1 },
          },
        },
      ]);

      unread.forEach((u) => {
        socket.emit(NEW_MESSAGE_ALERT, {
          chatId: u._id.toString(),
          count: u.count,
        });
      });
    } catch (err) {
      console.log("Error fetching unread alerts");
    }
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);

    membersSockets.forEach((sid) => {
      if (sid === socket.id) return;

      socket.to(sid).emit(STOP_TYPING, { chatId });
    });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSockets = getSockets(members);

    membersSockets.forEach((sid) => {
      io.to(sid).emit(ONLINE_USERS, Array.from(onlineUsers));
    });
  });

  socket.on(CHAT_JOINED, async ({ chatId }) => {
    try {
      if (chatId) {
        await Notification.updateMany(
          {
            receiver: socket.user._id,
            chat: chatId,
            isRead: false,
          },
          {
            isRead: true,
          }
        );

        console.log("Notifications marked read");
      }
    } catch (err) {
      console.log("Error marking notifications read");
    }
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSockets = getSockets(members);

    membersSockets.forEach((sid) => {
      io.to(sid).emit(ONLINE_USERS, Array.from(onlineUsers));
    });
  });

  socket.on("disconnect", () => {
    const userId = user._id.toString();

    if (userSocketIDs.get(userId) === socket.id) {
      userSocketIDs.delete(userId);
    }

    onlineUsers.delete(userId);

    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));

    console.log("Disconnected:", user.name);
  });
});
app.use(errorMiddleware);

server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${envMode} Mode`);
});

export { envMode, adminSecretKey, userSocketIDs };



// https://chat-app-frontend-dsux.vercel.app