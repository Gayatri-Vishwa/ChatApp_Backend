import { userSocketIDs } from "../app.js";

export const getOtherMember = (members, userId) =>
  members.find((member) => member._id.toString() !== userId.toString());

export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const getSockets = (users = []) => {
  return users.map((user) => {
    console.log(
      "Finding socket for:",
      user.toString(),
      "=>",
      userSocketIDs.get(user.toString())
    );

    return userSocketIDs.get(user.toString());
  });
};

