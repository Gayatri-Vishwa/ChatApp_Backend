import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { tryCatch } from "./error.js";
import { adminSecretKey } from "../app.js";

export const isAdmin = tryCatch((req, res, next) => {
  const token = req.cookies["chattu-admin-token"];

  if (!token)
    return next(
      new ErrorHandler("you are not authorized to access these rotes", 401),
    );

  const jwtSecret = jwt.verify(token, process.env.ADMIN_SECRET_KEY);
  console.log("jwt secret", jwtSecret);

  const isMatch= jwtSecret=== adminSecretKey
      if (!isMatch) return next(new Error("Only admin can access this route",401));

  next();
});
