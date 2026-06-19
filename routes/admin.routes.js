import express from 'express'
import { allChats,getAdminData, getDashboardStats,allUsers,allMessages, adminLogin, adminLogout } from '../controllers/admin.controller.js'
import { adminLoginValidator, validateHandler } from '../lib/validators.js'
import {isAdmin} from "../middlewares/adminAuth.js"

const app=express.Router()



app.post('/verify',adminLoginValidator(),validateHandler,adminLogin)
app.get('/logout',adminLogout)

//only admin can access these routes
app.use(isAdmin)

app.get('/',getAdminData)
app.get('/users',allUsers)   // only admin can access this route to see all users
app.get('/chats',allChats)
app.get('/messages',allMessages)
app.get('/stats',getDashboardStats)


export default app
