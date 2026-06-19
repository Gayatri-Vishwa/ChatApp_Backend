import express from 'express'
// import { getMyProfile, login, logout, newUser,searchUser } from '../controllers/user.controller.js'
import { attachmentsMulter, singleAvatar } from '../middlewares/multer.js'
import { isAuthenticated } from '../middlewares/auth.js'
import {newGroupChat,getMyGroups,getGroupCreator,clearChat,getMyChats,addMembers,removeMember,leaveGroup, sendAttachments, getChatDetails, getMessages,renameGroup, deleteChat} from '../controllers/chat.controller.js'
import { addMembersValidator, groupChatValidator, chatIdValidator,removeMembersValidator, validateHandler, sendAttachmentsValidator, renameValidator } from '../lib/validators.js'

const router=express.Router()



router.use(isAuthenticated)

router.post('/new',groupChatValidator(),validateHandler,newGroupChat)
router.get('/my',getMyChats)
router.get('/my/groups',getMyGroups)
router.put('/addmembers',addMembersValidator(),validateHandler,addMembers)
router.put('/removemember',removeMembersValidator(),validateHandler,removeMember)
router.delete('/leave/:id',chatIdValidator(),validateHandler,leaveGroup)

//send Attachments
router.post('/message',attachmentsMulter,sendAttachmentsValidator(),validateHandler,sendAttachments)

//get messages
router.get('/messages/:id',chatIdValidator(),validateHandler,getMessages)

//get chats details, rename ,  delete   ==same route but different method
router.route('/:id').get(chatIdValidator(),validateHandler,getChatDetails)
.put(renameValidator(),validateHandler,renameGroup)
.delete(chatIdValidator(),validateHandler,deleteChat)

router.delete("/clear/:id", isAuthenticated, clearChat);
router.get("/group/creator/:id", getGroupCreator);


export default router

