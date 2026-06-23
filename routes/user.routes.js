import express from 'express'
import { getMyProfile,getUnreadMessages,getNotifications,markNotificationsAsRead, login,getMyFriends, logout,getAllNotifications, newUser,searchUser,acceptFriendRequest, sendFriendRequest } from '../controllers/user.controller.js'
import { singleAvatar } from '../middlewares/multer.js'
import { isAuthenticated } from '../middlewares/auth.js'
import { loginValidator, registerValidator, acceptRequestValidator,sendRequestValidator, validateHandler } from '../lib/validators.js'
import { get } from 'mongoose'
import mongoose from "mongoose";

const app=express.Router()


app.post('/new',singleAvatar, registerValidator(),validateHandler,newUser) // register validator call because it returns array but validateHandler must be called after all the validators
app.post('/login', loginValidator(),validateHandler,login) 

// app.post(
//   "/new",
//   upload.single("avatar"),   // 👈 FIRST multer
//   registerValidator(),
//   validateHandler,
//   controller
// );

//after here user must be loggedin to access the routes
app.use(isAuthenticated)

app.get('/me',getMyProfile)
app.get('/logout',logout)
app.get('/search',searchUser)
app.put('/sendrequest',sendRequestValidator(),validateHandler,sendFriendRequest)
app.put('/acceptrequest',acceptRequestValidator(),validateHandler,acceptFriendRequest)
app.get('/notifications', getAllNotifications)
app.get('/friends', getMyFriends)

app.put("/notifications/read", isAuthenticated, markNotificationsAsRead);
app.get("/unreadmessages", isAuthenticated, getUnreadMessages);
export default app

