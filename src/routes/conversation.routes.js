const express = require('express');
const {
  getAllConversations,
  createConversation,
  createGroupConversation,
  deleteConversation,
  editConversation,
  addUserToConversation,
  removeUserFromConversation,
  exitFromConversation,
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

conversationRouter.route('/group').post(uploadFile('image'), createGroupConversation);

conversationRouter.route('/:conversationId').patch(editConversation).delete(deleteConversation);

conversationRouter.patch('/:conversationId/add', addUserToConversation);
conversationRouter.patch('/:conversationId/remove', removeUserFromConversation);
conversationRouter.patch('/:conversationId/exit', exitFromConversation);

module.exports = conversationRouter;
