import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {v4 as uuid} from "uuid"
import {v2 as cloudinary} from "cloudinary"
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
    secure: true,
  httpOnly: true,

  // sameSite: "lax",
// secure: false
};

const connectDb = async (uri) => {
  try {
    const data = await mongoose.connect(uri, { dbName: "Chattu" });
    console.log(`Connected to DB: ${data.connection.host}`);
  } catch (error) {
    console.log("DB Connection Error:", error.message);
    throw error;
  }
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return (
    res.
    status(code).cookie("chattu-token", token, cookieOptions).json({
      success: true,
      message,
         data: user,
    })
  );
};

const emitEvent =(req,event,users,data)=>{
  const io=req.app.get("io")
    console.log("EVENT:", event);
  console.log("USERS:", users);
  const userSockets = getSockets(users);
  console.log("SOCKETS:", userSockets);

  userSockets.forEach((sid) => {
    try {
      io.to(sid).emit(event, data);
      console.log("[emitEvent] emitted", event, "to", sid);
    } catch (err) {
      console.warn("[emitEvent] failed to emit", event, "to", sid, err);
    }
  });

  
}

const uploadFilesOnCloudinary = async (files) => {
  if (!files) return [];

  // convert single file → array
  const fileArray = Array.isArray(files) ? files : [files];

  const uploadPromises = fileArray.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) {
            console.log("Cloudinary Upload Error:", error);
            return reject(error);
          }
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);

    return results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
  } catch (error) {
    console.log("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload files");
  }
};


const deleteFilesFromCloudinary = async (public_ids) => {
  //code to delete files from cloudinary using their api
}

//simple
// const uploadFilesOnCloudinary = async (files) => {
//   const uploadPromises = files.map((file) => {
//     return new Promise((resolve, reject) => {
//       cloudinary.uploader.upload(
//         getBase64(file),
//         {
//           resource_type: "auto",
//           public_id: uuid(),
//         },
//         (error, result) => {
//           if (error) {
//             console.log("Cloudinary Upload Error:", error);
//             return reject(error);
//           }

//           resolve(result);
//         }
//       );
//     });
//   });

//   try {
//     const results = await Promise.all(uploadPromises);

//     const formattedResults = results.map((result) => ({
//       public_id: result.public_id,
//       url: result.secure_url,
//     }));

//     return formattedResults;
//   } catch (error) {
//     console.log("Cloudinary Upload Error:", error);
//     throw new Error("Failed to upload files");
//   }
// };


export { connectDb, sendToken ,cookieOptions,emitEvent,uploadFilesOnCloudinary, deleteFilesFromCloudinary};
