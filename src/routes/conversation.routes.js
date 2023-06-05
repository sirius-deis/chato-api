const express = require('express');
const { getAllConversations, createConversation } = require('../controllers/conversation.controllers');
const auth = require('../middlewares/auth.middlewares');

const conversationRoutes = express.Router();

conversationRoutes.use(auth.isLoggedIn);

conversationRoutes.route('/:userId').get(getAllConversations).post(createConversation);

module.exports = conversationRoutes;
