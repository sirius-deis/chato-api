const express = require('express');
const {
  getAllConversations,
  createConversation,
  deleteConversation,
} = require('../controllers/conversation.controllers');
const { isLoggedIn } = require('../middlewares/auth.middlewares');
const { uploadFile } = require('../api/file');
const messageRouter = require('./message.routes');

const conversationRouter = express.Router({ mergeParams: true });

conversationRouter.use(isLoggedIn);

conversationRouter.use('/:conversationId/messages', messageRouter);

conversationRouter
  .route('/')
  .get(getAllConversations)
  .post(uploadFile('image'), createConversation);

conversationRouter.route('/:conversationId').delete(deleteConversation);

module.exports = conversationRouter;
