import { faker, simpleFaker } from "@faker-js/faker";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";   

const createUser=async(numUsers)=>{
try {
    
const usersPromise=[]

for(let i=0; i<numUsers ; i++){
   const tempUser=User.create({
    name:faker.person.fullName(),
    username:faker.internet.username(),
    bio:faker.lorem.sentence(),
    password:"password",
    avatar:{
        url:faker.image.avatar(),
        public_id:faker.system.fileName()
    }
   })
    usersPromise.push(tempUser)
}
await Promise.all(usersPromise)
console.log("users created ",numUsers);
  process.exit(1)

} catch (error) {
    console.error(error);
    process.exit(1)
}
}




export {createUser}

