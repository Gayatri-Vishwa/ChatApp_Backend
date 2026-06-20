import { tryCatch } from "../middlewares/error.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import jwt  from "jsonwebtoken";
import { cookieOptions } from "../utils/features.js";
import {adminSecretKey} from'../app.js'

const adminLogin = tryCatch(async (req, resp, next) => {

    const {secretKey}=req.body
   

    const isMatch=secretKey === adminSecretKey

    // if (!isMatch) return next(new Error("Invalid Secret Key",401));
    if (!isMatch)
  return next(new ErrorHandler("Invalid Secret Key", 401));

const token =jwt.sign( secretKey,process.env.ADMIN_SECRET_KEY)

    resp.status(200).cookie("chattu-admin-token",token,{...cookieOptions,maxAge:1000*60*15})
    .json({
        success:true,
        message:"Admin verified successfully,welcome Boss"
    })

   
});
const getAdminData = tryCatch(async (req, resp, next) => {
    resp.status(200)
    .json({
        success:true,
        admin:true,
       
    })
});



const adminLogout = tryCatch(async (req, resp, next) => {



    resp.status(200).cookie("chattu-admin-token","",{cookieOptions,maxAge:0})
    .json({
        success:true,
        message:"Admin Logged out successfully"
    })


   
});

const allUsers = tryCatch(async (req, resp) => {
  const users = await User.find(); // .select("-password")  // password field ko exclude krne k liye -password use krte h by default exclude hi h

  const transformedUsers = await Promise.all(
    users.map(async ({ _id, name, email, avatar }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        _id,
        name,
        email,
        avatar: avatar.url,
        groups,
        friends,
      };
    }),
  );

  resp.status(200).json({
    success: true,
    transformedUsers,
  });
});

const allChats = tryCatch(async (req, resp) => {
  const chats = await Chat.find()
    .populate("members", "name  avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ _id, name, groupChat, members, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        name,
        groupChat,
        avatar: members.slice(0, 3).map((member) => member.avatar.url), // group chat me first 3 members ke avatar show krne h aur agar group chat nhi h to creator ka avatar show krna h
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar?.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    }),
  );

  resp.status(200).json({
    success: true,
    transformedChats,
  });
});

const allMessages = tryCatch(async (req, resp) => {
  const messages = await Message.find()
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  messages.forEach((msg) => {
    console.log("sender =>", msg.sender);
    console.log("chat =>", msg.chat);
  });

  

  const transformedMessages = messages.map(
  ({ _id, content, createdAt, attachments, sender, chat }) => ({
    _id,
    content,
    attachments,
    createdAt,
    chat: chat?._id,
    groupChat: chat?.groupChat,
    sender: sender
      ? {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar?.url || "",
        }
      : null,
  })
);
  resp.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});



const getDashboardStats = tryCatch(async (req, resp) => {
  const [groupCount, userCount, totalChatsCount, messageCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Chat.countDocuments(),
      Message.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(today.getDate() - 7);

  const last7DaysMessages = await Message.find({
    createdAt: { $gte: last7Days, $lte: today },
  }).select("createdAt");


const messages=new Array(7).fill(0)  // last 7 days ke messages count krne k liye array banaya h jisme 7 elements h aur sabhi elements ki value 0 h
const dayInMilliseconds=24*60*60*1000  

last7DaysMessages.forEach(message=>{

    const indexApprox= (today.getTime()-message.createdAt.getTime())/dayInMilliseconds;  // message createdAt se current date tak kitne din hue h ye calculate krne k liye
  const index= Math.floor(indexApprox)  

    if (index >= 0 && index < 7) {
    messages[6 - index]++;
  }
})


  resp.status(200).json({
  success: true,
  stats: {
    usersCount: userCount,
    totalChatsCount: totalChatsCount,
    messagesCount: messageCount,
    groupsCount: groupCount,
    messagesChart: messages,
  },
});
});


export { allUsers, allChats,adminLogout,getAdminData, allMessages,adminLogin, getDashboardStats };
