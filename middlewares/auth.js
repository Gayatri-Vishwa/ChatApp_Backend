import { CHATTU_TOKEN } from "../constants/config.js";
import { ErrorHandler } from "../utils/utility.js";
import { tryCatch } from "./error.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const isAuthenticated = tryCatch((req, res, next) => {
  const token = req.cookies["chattu-token"];

  if (!token) {
    return next(new ErrorHandler("Please login to access this route", 400));
  }
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  req.user = decodedData._id;
 

  next();
});

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);
    const authToken = socket.request.cookies[CHATTU_TOKEN];
    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));
    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);
    if (!user)
      return next(new ErrorHandler("Please login to access this route", 401));

    socket.user = user;
    return next();
  } catch (error) {
    console.log(error);

    return next(new ErrorHandler("Please login to access this route", 401));
  }
};

export { isAuthenticated, socketAuthenticator };
