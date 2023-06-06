const express = require('express');
const {
  getAllConversations,
  createConversation,
  deleteConversation,
} = require('../controllers/conversation.controllers');
const auth = require('../middlewares/auth.middlewares');
const messageRouter = require('./message.routes');

const conversationRouter = express.Router({ mergeParams: true });

conversationRouter.use('/:conversationId/messages', messageRouter);

conversationRouter.use(auth.isLoggedIn);

conversationRouter.route('/').get(getAllConversations).post(createConversation);

conversationRouter.route('/:conversationId').delete(deleteConversation);

module.exports = conversationRouter;
