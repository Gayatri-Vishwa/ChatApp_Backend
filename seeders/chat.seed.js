import { faker, simpleFaker } from "@faker-js/faker";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";  

const createSingleChats=async(numChats)=>{
    try {
      const  users=await User.find().select("_id")
      const chatsPromise=[]

      for(let i=0; i<numChats; i++){
      for(let j=i+1; j<numChats ; j++){
      
        chatsPromise.push(
            Chat.create({
              name:faker.lorem.words(2),
              members:[users[i],users[j]],
            
            })
        )
    

      }

      }
        
         await Promise.all(chatsPromise)
         console.log("single chats created successfully ",chatsPromise.length);
         process.exit(1)
    } catch (error) {
     console.log(error);
        process.exit(1)
        
    }
}


// const createGroupChat=async(numGroups)=>{
//     try {
//         const  users=await User.find().select("_id")
//         const members=[]

//         for(let i=0; i<users.length-1 ; i++){
//             const numMembers=simpleFaker.number.int({min:3,max:users.length})
//             const members=[]
//             for(let j=0; j<numMembers ; j++){
//                 const randomIndex=simpleFaker.number.int({min:0,max:users.length-1})
//                const randomUser=users[randomIndex]
//                 if(!members.includes(randomUser)){
//                     members.push(randomUser)
//                 }
//             }
//         }
//         const chat =Chat.create({
//             name:faker.lorem.words(1),
//             creator:members[0],
//             groupChat:true
//         })

//         console.log("group chats created successfully ",numGroups);
//         process.exit(1)
//     } catch (error) {
//           console.log(error);
//         process.exit(1)
//     }
// }


const createGroupChat = async (numGroups) => {

  try {

    const users = await User.find().select("_id")

    const chatsPromise = []

    for(let i = 0; i < numGroups; i++){

      const numMembers = simpleFaker.number.int({
        min:3,
        max:users.length
      })

      const members = []

      while(members.length < numMembers){

        const randomUser =
          users[Math.floor(Math.random() * users.length)]

        const id = randomUser._id.toString()

        if(!members.includes(id)){
          members.push(id)
        }
      }

      chatsPromise.push(
        Chat.create({
          name: faker.lorem.words(2),
          members,
          creator: members[0],
          groupChat: true
        })
      )
    }

    await Promise.all(chatsPromise)

    console.log(
      "group chats created successfully",
      chatsPromise.length
    )

    process.exit(1)

  } catch (error) {

    console.log(error)
    process.exit(1)
  }
}

const createMessages=async(chatId,numMessages)=>{
    try {
        const  users=await User.find().select("_id")
        const chats=await Chat.find().select("_id")
        const messagesPromise=[]

        for(let i=0; i<numMessages ; i++){
          const randomUser=users[Math.floor(Math.random()*users.length)]
          const randomChat=chats[Math.floor(Math.random()*chats.length)]
          messagesPromise.push(
            Message.create({
                chat:randomChat_id,    
                sender:randomUser_id,
                content:faker.lorem.sentence(),
                createdAt: new Date(),
            })
        )
        }

 

        await Promise.all(messagesPromise)
        console.log("messages created successfully ",messagesPromise.length);
        process.exit(1)
    } catch (error) {
        console.log(error);
        process.exit(1)
    }
}

const createMessageInChat=async(chatId,numMessages)=>{
   try {
    const  users=await User.find().select("_id")
    const messagesPromise=[]  
    for(let i=0; i<numMessages ; i++){
        const randomUser=users[Math.floor(Math.random()*users.length)]
        messagesPromise.push(
          Message.create({
              chat:chatId,    
              sender:randomUser,
              content:faker.lorem.sentence(),
              createdAt: new Date()
          })
      )
      }

}

    catch (error) {
        console.log(error);
        process.exit(1)
    }
}

export {createSingleChats,createGroupChat,createMessages,createMessageInChat}