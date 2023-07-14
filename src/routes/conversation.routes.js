const express = require('express');
const {
  getAllConversations,
  createConversation,
  createGroupConversation,
  deleteConversation,
  editConversation,
  addUserToGroupConversation,
  removeUserFromGroupConversation,
  exitFromGroupConversation,
  joinGroupConversation,
  changeUserRoleInConversation,
} = require('../controllers/conversation.controllers');
const { isLoggedIn } = require('../middlewares/auth.middlewares');
const { uploadFile } = require('../api/file');
const { isNotEmpty } = require('../utils/validator');
const validationMiddleware = require('../middlewares/validation.middlewares');
const messageRouter = require('./message.routes');

const conversationRouter = express.Router({ mergeParams: true });

conversationRouter.use(isLoggedIn);

conversationRouter.use('/:conversationId/messages', messageRouter);

conversationRouter
  .route('/')
  .get(getAllConversations)
  .post(uploadFile('image'), createConversation);

conversationRouter
  .route('/group')
  .post(
    uploadFile('image'),
    isNotEmpty({ field: 'title' }),
    validationMiddleware,
    createGroupConversation,
  );

conversationRouter.route('/:conversationId').patch(editConversation).delete(deleteConversation);

conversationRouter.patch('/:conversationId/add', addUserToGroupConversation);
conversationRouter.patch('/:conversationId/remove', removeUserFromGroupConversation);
conversationRouter.patch('/:conversationId/exit', exitFromGroupConversation);
conversationRouter.patch('/:conversationId/join', joinGroupConversation);
conversationRouter.patch('/:conversationId/role', changeUserRoleInConversation);

module.exports = conversationRouter;
