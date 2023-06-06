const express = require('express');
const {
  getAllConversations,
  createConversation,
  deleteConversation,
} = require('../controllers/conversation.controllers');
const auth = require('../middlewares/auth.middlewares');

const conversationRoutes = express.Router({ mergeParams: true });

conversationRoutes.use(auth.isLoggedIn);

conversationRoutes.route('/').get(getAllConversations).post(createConversation);

conversationRoutes.route('/:conversationId').delete(deleteConversation);

module.exports = conversationRoutes;
