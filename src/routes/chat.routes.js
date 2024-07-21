const express = require("express");
const {
  getAllChats,
  createPrivateChat,
  createChat,
  deleteChat,
  editChat,
  addUserToGroupChat,
  removeUserFromGroupChat,
  leaveGroupChat,
  joinGroupChat,
  changeUserRoleInChat,
  getListOfChatParticipants,
  addPicture,
  findChats,
} = require("../controllers/chat.controllers");
const { isLoggedIn } = require("../middlewares/auth.middlewares");
const { uploadFile } = require("../api/fileUpload");
const { isNotEmpty } = require("../utils/validator");
const validationMiddleware = require("../middlewares/validation.middlewares");
const messageRouter = require("./message.routes");

const chatRouter = express.Router({ mergeParams: true });

chatRouter.use(isLoggedIn);

chatRouter.use("/:chatId/messages", messageRouter);

chatRouter.route("/").get(getAllChats);

chatRouter.route("/private").post(uploadFile("image"), createPrivateChat);

chatRouter.route("/list").post(uploadFile("image"), getListOfChatParticipants);

chatRouter.post("/:chatId/search", findChats);

chatRouter
  .route("/group")
  .post(
    uploadFile("image"),
    isNotEmpty({ field: "title" }),
    validationMiddleware,
    createChat
  );

chatRouter
  .route("/:chatId")
  .patch(isNotEmpty({ field: "title" }), validationMiddleware, editChat)
  .delete(deleteChat);

chatRouter.patch("/:chatId/add", addUserToGroupChat);
chatRouter.patch("/:chatId/remove", removeUserFromGroupChat);
chatRouter.patch("/:chatId/exit", leaveGroupChat);
chatRouter.patch("/:chatId/join", joinGroupChat);
chatRouter.patch("/:chatId/role", changeUserRoleInChat);

chatRouter.post("/:chatId/pictures", addPicture);

module.exports = chatRouter;
