const express = require('express');
const {
  getMessages,
  getMessage,
  addMessage,
  editMessage,
  deleteMessage,
  reactOnMessage,
  unsendMessage,
} = require('../controllers/message.controllers');
const { isLoggedIn } = require('../middlewares/auth.middlewares');
const { isNotEmpty } = require('../utils/validator');
const { uploadFiles } = require('../api/file');

const messageRouter = express.Router({ mergeParams: true });

messageRouter.use(isLoggedIn);

messageRouter
  .route('/')
  .get(getMessages)
  .post(isNotEmpty('message'), uploadFiles('files', 5), addMessage);

messageRouter
  .route('/:messageId')
  .get(getMessage)
  .put(editMessage)
  .patch(reactOnMessage)
  .delete(deleteMessage);

messageRouter.delete('/:messageId/unsend', unsendMessage);

module.exports = messageRouter;
