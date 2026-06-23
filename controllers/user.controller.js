import { compare } from "bcrypt";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { cookieOptions, emitEvent, sendToken } from "../utils/features.js";
import { tryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Request } from "../models/request.model.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import { Notification } from "../models/notification.model.js";
import mongoose from "mongoose";
import {
  uploadFilesOnCloudinary,
  deleteFilesFromCloudinary,
} from "../utils/features.js";

// create  new user and save it to the database and save token in cookies
//my
const newUser = tryCatch(async (req, resp, next) => {
  const { name, username, password, bio } = req.body;

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please upload Avatar"));

  const result = await uploadFilesOnCloudinary([file]); //willl return array of uploaded files with their urls and public_ids

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({ name, username, password, avatar, bio });

  sendToken(resp, user, 201, "User Created successfully");
});

const login = tryCatch(async (req, resp, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password"); //password b select krna h

  if (!user) {
    return next(new ErrorHandler("Invalid username ", 404));
  }

  const isMatch = await compare(password, user.password);

  if (!isMatch) {
    return next(new ErrorHandler("Invalid Password", 404));
  }
  
  sendToken(resp, user, 200, `Welcome  Back ${user.name}`);
  
});


const getMyProfile = tryCatch(async (req, resp) => {
  const user = await User.findById(req.user);
  resp.status(200).json({
    success: true,
    data: user,
  });
});

const logout = tryCatch(async (req, resp) => {
  return resp
    .status(200)
    .cookie("chattu-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "logged out successfully",
    });
});

const searchUser = tryCatch(async (req, resp) => {
  const { name = " " } = req.query;

  //find all my chats and get the users from those chats except me
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  //extracting frnds ,people i have chattted with this is for search user in search bar
  const allowUsersFromMyChats = myChats.map((chat) => chat.members).flat(); //flat krke sare members nikal liye array s


const excludedUsers = [...allowUsersFromMyChats, req.user];

const allUserExceptMeAndFriends = await User.find({
  _id: { $nin: excludedUsers },
  name: { $regex: name, $options: "i" },
});


  //modify the users to send only _id,name and avatar url
  const users = allUserExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));



  return resp.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = tryCatch(async (req, resp, next) => {
  const { userId } = req.body;
 

  // check if the request is already sent   ===req.user is logged in user and userId is the receiver of the request
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });


  if (request) {

  // current user ne hi pehle request bheji thi
  if (request.sender.toString() === req.user.toString()) {
    return next(new ErrorHandler("Request already sent", 400));
  }

  // saamne wale ne request bheji hui hai
  return next(
    new ErrorHandler(
      "This user has already sent you a request. Please accept it from notifications.",
      400
    )
  );
}
  const existingChat = await Chat.findOne({
    members: { $all: [req.user, userId] },
    groupChat: false,
  });

  if (existingChat) {
    return next(new ErrorHandler("You are already friends", 400));
  }

  emitEvent(req, NEW_REQUEST, [userId]); // emit event to the receiver of the request to get the new request in real time
  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  return resp.status(200).json({
    success: true,
    message: "friend request sent successfully",
  });
});

const acceptFriendRequest = tryCatch(async (req, resp, next) => {
  const { requestId, action } = req.body;



  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) {
    return next(new ErrorHandler("Request not found", 404));
  }

 


  const receiverId = request.receiver._id || request.receiver;

  if (receiverId.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not authorized to accept this request", 403),
    );
  }

  if (!action) {
      await request.deleteOne();
  
  
    return resp.status(200).json({
      success: true,
      message: "friend request rejected successfully",
    });
  }

  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} - ${request.receiver.name}`,
    }),
      request.deleteOne(), // IMPORTANT FIX
  
   
  ]);

  emitEvent(req, REFETCH_CHATS, members); // emit event to both sender and receiver of the request to get the new request in real time

  return resp.status(200).json({
    success: true,
    message: "friend request accepted successfully",
    senderId: request.sender._id,
  });
});


//mine
// const getAllNotifications = tryCatch(async (req, resp) => {
//   const requests = await Request.find({ receiver: req.user }).populate(
//     "sender",
//     "name avatar",
//   );

//   const allRequests = requests.map(({ _id, sender }) => ({
//     _id,
//     sender: { _id: sender._id, name: sender.name, avatar: sender.avatar.url },
//   }));

//   return resp
//     .status(200)

//     .json({
//       success: true,
//       allRequests,
//     });
// });

//this is not working properly i think there is some problem with the getOtherMember function in helper.js file


const getAllNotifications = tryCatch(async (req, resp) => {

  const requests = await Request.find({
    receiver: req.user,
  }).populate("sender", "name avatar");

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
    
  }));


  return resp.status(200).json({
    success: true,
    allRequests,
    // notifications,
  });

});

const getMyFriends = tryCatch(async (req, resp) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");


  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id),
    );

    return resp.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return resp.status(200).json({
      success: true,
      friends,
    });
  }
});
const getNotifications = tryCatch(async (req, res) => {

  const notifications = await Notification.find({
    receiver: req.user,
    isRead: false,
  }).populate("sender", "name avatar");

  return res.status(200).json({
    success: true,
    notifications,
  });

});
const markNotificationsAsRead = tryCatch(async (req, res) => {

  await Notification.updateMany(
    {
      receiver: req.user,
      isRead: false,
    },
    {
      isRead: true,
    }
  );

  res.status(200).json({
    success: true,
  });

});


const getUnreadMessages = tryCatch(async (req, res) => {
    console.log("getUnreadMessages called");
  const notifications = await Notification.aggregate([
    {
      $match: {
        // `req.user` is set to the user's id by the auth middleware
        receiver: new mongoose.Types.ObjectId(req.user),
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
console.log("user",req.user);
  res.status(200).json({
    success: true,
    notifications,
  });
});

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends,
getNotifications,
  markNotificationsAsRead,
  getUnreadMessages
};




// try {
//   await Message.create(messageForDB);

//   for (const member of members) {
//     console.log("Member:", member);

//     if (member.toString() === user._id.toString()) continue;

//     const notification = await Notification.create({
//       sender: user._id,
//       receiver: member,
//       type: "message",
//       chat: chatId,
//     });

//     console.log("Notification created:", notification);
//   }
// } catch (error) {
//   console.log(error);
// }