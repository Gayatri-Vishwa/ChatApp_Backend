import { el } from "@faker-js/faker";
import { body, check, param, validationResult, query } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

//it returns a array of validation middlewares for validating the request body for registration
const registerValidator = () => [
  body("name", "Please enter a name").notEmpty(),
  body("username", "Please enter a username").notEmpty(),
  body("password", "Please enter a password").isLength({ min: 6 }),
  body("bio", "Please enter a bio").optional(),

];
const loginValidator = () => [
  body("username", "Please enter a username").notEmpty(),
  body("password", "Please enter a password").notEmpty(),
];

const groupChatValidator = () => [
  body("name", "Please enter a name").notEmpty(),
  body("members", "Please enter members")
    .notEmpty()
    .withMessage("Please enter  members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2- 100 "),
];
const addMembersValidator = () => [
  body("chatId", "Please enter a chat ID").notEmpty(),
  body("members", "Please enter members")
    .notEmpty()
    .withMessage("Please enter  members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1- 97 "),
];
const removeMembersValidator = () => [
  body("chatId", "Please enter a chat ID").notEmpty(),
  body("userId", "Please enter a user ID").notEmpty(),
];
const sendAttachmentsValidator = () => [
  body("chatId", "Please enter a chat ID").notEmpty(),

];
const chatIdValidator = () => [
  param("id", "Please enter a chat ID").notEmpty(),
];

const renameValidator = () => [

  param("id", "Please enter a chat ID").notEmpty(),
    body("name", "Please enter a New Name").notEmpty(),
];
const sendRequestValidator = () => [
    body("userId", "Please enter a User ID").notEmpty(),
];

const acceptRequestValidator = () => [
    body("requestId", "Please enter a Request ID").notEmpty(),
    body("action").notEmpty().notEmpty().withMessage("Please add action").isBoolean().withMessage("Action must be boolean")
]
const adminLoginValidator = () => [
    body("secretKey", "Please enter a Secret Key").notEmpty(),
]






const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessage = errors
    .array()
    .map((error) => error.msg)
    .join(", ");

  console.log(errorMessage);

  if (errors.isEmpty()) {
    // return res.status(400).json({errors:errors.array()})
    next();
  } else {
    return next(new ErrorHandler(errorMessage, 400));
  }
};



export {
  registerValidator,
  sendAttachmentsValidator,
  chatIdValidator,
  renameValidator,
  adminLoginValidator,
  sendRequestValidator,
  acceptRequestValidator,
  loginValidator,
  validateHandler,
  groupChatValidator,
  addMembersValidator,
  removeMembersValidator,
};
