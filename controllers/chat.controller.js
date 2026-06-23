import { tryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.model.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesOnCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";


const newGroupChat = tryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user];

  // check if group with same name already exists for this user
  const existingGroup = await Chat.findOne({
    name,
    groupChat: true,
    members: req.user,
  });

  if (existingGroup) {
    return res.status(400).json({
      success: false,
      message: "Group with this name already exists",
    });
  }

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, allMembers);

  return res.status(201).json({
    success: true,
    message: "Group created",
  });
});

const getMyChats = tryCatch(async (req, res, next) => {

  const chats = await Chat.find({
    members: { $in: [req.user] },
  }).populate("members", "name avatar");

  const transformedChats = chats.map(({ _id, name, groupChat, members }) => {
    const otherMember = getOtherMember(members, req.user);

    return {
      _id,
      name: groupChat ? name : otherMember?.name || "Unknown",
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map((member) => member.avatar?.url)
        : [otherMember?.avatar?.url],
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });
  return res.status(201).json({
    success: true,
    chats: transformedChats,
  });
});

const getMyGroups = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    name,
    groupChat,
    avatar: members.slice(0, 3).map((member) => member.avatar?.url),
  }));

  res.status(200).json({
    success: true,
    groups,
  });
});

const addMembers = tryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a Group Chat", 400));

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Only group creator can add members", 403));

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));
  const allNewMembers = await Promise.all(allNewMembersPromise);
  const uniqueMembers = allNewMembers.filter(
    (i) => !chat.members.includes(i._id.toString()),
  );

  // chat.members.push(...allNewMembers.map(i=>i._id))
  chat.members.push(...uniqueMembers);

  if (chat.length > 100)
    return next(new ErrorHandler("Group members limit exceeded", 400));

  await chat.save();
  const allUsersNames = allNewMembers.map((i) => i.name).join(", ");
  emitEvent(
    req,
    ALERT,
    chat.members,
    `welcome ${allUsersNames} to ${chat.name} group`,
  );
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(201).json({
    success: true,
    message: "Members added successfully",
  });
});

const removeMember = tryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a Group Chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Only group creator can remove members", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString(),
  );

  await chat.save();

  emitEvent(req, ALERT, chat.members, {
    message: `${userThatWillBeRemoved.name} has been removed from thegroup`,
    chatId,
  });
  emitEvent(req, REFETCHCHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});

//orignl
const leaveGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id; //:id shoud be same as in route :id or :chatId
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a Group Chat", 400));


  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString(),
  );
  if (remainingMembers.length < 2)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  //remove my self from members list if i was creator of group then assign new creator from remaining members

  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  //remove my self from members list

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `User ${user.name} has been left the group`,
  });
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});

const sendAttachments = tryCatch(async (req, res, next) => {
  const { chatId } = req.body || [];
  const files = req.files;
  if (files.length < 1)
    return next(new ErrorHandler("Please Upload Attachments", 400));

  if (files.length > 5)
    return next(new ErrorHandler("Files  Can't be more than 5", 400));

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  //upload filees hre
  const attachments = await uploadFilesOnCloudinary(files); //after uploading files we will get array of file url from cloudinary

  const messageForDb = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };
  const messageForRealtime = {
    ...messageForDb,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  const message = await Message.create(messageForDb);
  // const message = await Message.create(messageForDb);

  // create notifications for recipients (so offline users get unread alerts)
  try {
    const recipients = chat.members.filter(
      (m) => m.toString() !== me._id.toString()
    );

    if (recipients.length > 0) {
      const docs = recipients.map((r) => ({
        sender: me._id,
        receiver: r,
        type: "message",
        chat: chatId,
      }));
      await Notification.insertMany(docs);
    }
  } catch (err) {
    console.warn("Failed to create notifications for attachments:", err);
  }

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealtime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

//mine
const getChatDetails = tryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean(); //lean() is used to get plain js object instead of mongoose document so that we can modify it directly

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("Only group creator can rename the group", 403),
    );
  chat.name = name;
  await chat.save();

  // emitEvent(req,ALERT,chat.members,`Group has been renamed to ${name}`)
  emitEvent(req, REFETCHCHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group renamed successfully",
  });
});

const deleteChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const member = chat.members;

  if (!chat.groupChat && !chat.members.includes(req.user))
    return next(new ErrorHandler("You are not a member of this chat", 403));

  //here we have to delete whole chat and messages of that chat as well asa atttachments of that chat from cloudinary
  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];
  messageWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => {
      public_ids.push(public_id);
    });
  });

  await Promise.all([
    //delete files from cloudinary
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(), //or we can also use
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, member);
  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

const getMessages = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const { page = 1 } = req.query;
  const result_per_page = 20;
  const skip = (page - 1) * result_per_page;

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(result_per_page)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  // 79/20=3.95 -> 4 //celling of total pages
  const totalPages = Math.ceil(totalMessagesCount / result_per_page) || 0;
  return res.status(200).json({
    success: true,
    messages: messages.reverse(), //because we have sorted messages in descending order but we want to show in ascending order
    totalPages,
  });
});

const clearChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  // user member hai ya nahi
  if (!chat.members.some((member) => member.toString() === req.user.toString()))
    return next(new ErrorHandler("You are not a member of this chat", 403));

  // attachments ke public ids nikal lo
  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messageWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => {
      public_ids.push(public_id);
    });
  });

  // sirf messages delete karo
  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    Message.deleteMany({ chat: chatId }),
  ]);

  return res.status(200).json({
    success: true,
    message: "Chat cleared successfully",
  });
});

const getGroupCreator = tryCatch(async (req, res, next) => {
  const { id } = req.params;

  const chat = await Chat.findById(id)
    .select("creator groupChat")
    .populate("creator", "name");

  if (!chat)
    return next(new ErrorHandler("Chat not found", 404));

  // Single chat
  if (!chat.groupChat) {
    return res.status(200).json({
      success: true,
      creator: null,
    });
  }

  // Group chat
  return res.status(200).json({
    success: true,
    creator: {
      _id: chat.creator?._id,
      name: chat.creator?.name || "Admin",
    },
  });
});



export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
  clearChat,
  getGroupCreator,
 
 
};
