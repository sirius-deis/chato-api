// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const User = require('../models/user.models');
const Conversation = require('../models/conversation.models');
const Message = require('../models/message.models');

const baseUrl = '/api/v1/messages';

const createUser = async (text) =>
  await User.create({
    email: `${text}@test.com`,
    password: 'password',
    firstName: text,
    lastName: text,
    bio: text,
    isActive: true,
  });

const createConversation = async (user1Id, user2Id) => {
  const conversation = await Conversation.create({
    type: 'private',
    creatorId: user1Id,
    title: undefined,
  });
  conversation.addUser(user1Id, { through: { role: 'user' } });
  conversation.addUser(user2Id, { through: { role: 'user' } });
  await conversation.save();
  return conversation;
};

const createMessage = async (conversationId, senderId, message) =>
  await Message.create({ conversationId: conversationId, senderId, message });

describe('/messages route', () => {
  let token1;
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    await redisConnect();
    const user1 = await createUser('test1');
    const user2 = await createUser('test2');
    const user3 = await createUser('test3');
    const conversation1 = await createConversation(user1.dataValues.id, user2.dataValues.id);
    await createConversation(user1.dataValues.id, user3.dataValues.id);
    await createMessage(conversation1.dataValues.id, user1.dataValues.id, 'message 1');
    await createMessage(conversation1.dataValues.id, user2.dataValues.id, 'message 2');
    await createMessage(conversation1.dataValues.id, user1.dataValues.id, 'message 3');
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test1@test.com', password: 'password' });
    token1 = res.body.token;
  });
  afterAll(async () => {
    await sequelize.close();
    await redisDisconnect();
  });
  describe('get all messages controller', () => {
    it('should return 401 as there is no token provided', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 404 as there are no message for such conversation', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
  });
});
