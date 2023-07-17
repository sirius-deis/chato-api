// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const User = require('../models/user.models');
const Chat = require('../models/chat.models');
const Message = require('../models/message.models');
const DeletedMessage = require('../models/deletedMessage.models');

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
  const conversation = await Chat.create({
    type: 'private',
    creatorId: user1Id,
    title: undefined,
  });
  conversation.addUser(user1Id, { through: { role: 'user' } });
  conversation.addUser(user2Id, { through: { role: 'user' } });
  await conversation.save();
  return conversation;
};

const createMessage = async (chatId, senderId, message) =>
  await Message.create({ chatId: chatId, senderId, message });

describe('/messages route', () => {
  let token1;
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    await redisConnect();
    const user1 = await createUser('test1');
    const user2 = await createUser('test2');
    const user3 = await createUser('test3');
    const user4 = await createUser('test4');
    const conversation1 = await createConversation(user1.dataValues.id, user2.dataValues.id);
    const conversation2 = await createConversation(user1.dataValues.id, user3.dataValues.id);
    const conversation3 = await createConversation(user2.dataValues.id, user3.dataValues.id);
    await createConversation(user1.dataValues.id, user4.dataValues.id);
    await createMessage(conversation1.dataValues.id, user1.dataValues.id, 'message 1');
    await createMessage(conversation1.dataValues.id, user2.dataValues.id, 'message 2');
    await createMessage(conversation1.dataValues.id, user1.dataValues.id, 'message 3');
    const message4 = await createMessage(
      conversation1.dataValues.id,
      user1.dataValues.id,
      'message 4',
    );
    await createMessage(conversation3.dataValues.id, user3.dataValues.id, 'message 4');
    const message5 = await createMessage(
      conversation2.dataValues.id,
      user1.dataValues.id,
      'message 5',
    );
    await DeletedMessage.create({ userId: user1.dataValues.id, messageId: message4.dataValues.id });
    await DeletedMessage.create({ userId: user1.dataValues.id, messageId: message5.dataValues.id });
    await user4.addBlocker(user1.dataValues.id);
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
        .get('/api/v1/chats/1/messages')
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
        .get('/api/v1/chats/100/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There are no messages for such conversation');
        })
        .end(done);
    });
    it('should return 200 and return messages', (done) => {
      request(app)
        .get('/api/v1/chats/1/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Your messages were retrieved successfully');
          expect(res.body.data.messages.length).toBe(3);
        })
        .end(done);
    });
  });
  describe('get message by id controller', () => {
    it('should return 401 as there is no token provided', (done) => {
      request(app)
        .get('/api/v1/chats/1/messages/1')
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
    it('should return 404 as there is no message with such id', (done) => {
      request(app)
        .get('/api/v1/chats/1/messages/1000')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no message with such id');
        })
        .end(done);
    });
    it("should return 403 as current user doesn't have access to this message", (done) => {
      request(app)
        .get('/api/v1/chats/3/messages/5')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(403)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('This message is not your');
        })
        .end(done);
    });
    it('should return 404 as message was deleted', (done) => {
      request(app)
        .get('/api/v1/chats/2/messages/6')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no message with such id');
        })
        .end(done);
    });
    it('should return 200 and return message', (done) => {
      request(app)
        .get('/api/v1/chats/1/messages/2')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Your message was retrieved successfully');
          expect(res.body.data.message.id).toBe(2);
          expect(res.body.data.message.chatId).toBe(1);
          expect(res.body.data.message.message).toBe('message 2');
        })
        .end(done);
    });
  });
  describe('add message controller', () => {
    it('should return 401 as there is no token provided', (done) => {
      request(app)
        .post('/api/v1/chats/1/messages')
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
    it('should return 400 as there is no message provided', (done) => {
      request(app)
        .post('/api/v1/chats/1/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: '' })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual(["Field: message can't be empty"]);
        })
        .end(done);
    });
    it('should return 404 as there is no conversation with such id', (done) => {
      request(app)
        .post('/api/v1/chats/1000/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some text' })
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no conversation with such id');
        })
        .end(done);
    });
    it('should return 400 as user was blocked by selected receiver', (done) => {
      request(app)
        .post('/api/v1/chats/4/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some text' })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('You were blocked by selected user');
        })
        .end(done);
    });
    it('should return 400 as there is no message to reply with such id', (done) => {
      request(app)
        .post('/api/v1/chats/1/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some text', repliedMessageId: 1000 })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no message to reply with such id');
        })
        .end(done);
    });
    it('should return 400 as message to reply with provided id was deleted', (done) => {
      request(app)
        .post('/api/v1/chats/1/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some text', repliedMessageId: 4 })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no message to reply with such id');
        })
        .end(done);
    });
    it('should return 201 and save a message', (done) => {
      request(app)
        .post('/api/v1/chats/1/messages')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some text', repliedMessageId: 1 })
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Your message was sent successfully');
        })
        .end(done);
    });
  });
  describe('edit message controller', () => {
    it('should return 401 as there is no token provided', (done) => {
      request(app)
        .put('/api/v1/chats/1/messages/1')
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
    it('should return 400 as there is no message provided', (done) => {
      request(app)
        .put('/api/v1/chats/1/messages/1')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: '' })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual(["Field: message can't be empty"]);
        })
        .end(done);
    });
    it('should return 404 as there is no message with provided id', (done) => {
      request(app)
        .put('/api/v1/chats/1/messages/1000')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some message' })
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no such message that you can edit');
        })
        .end(done);
    });
    it('should return 404 as it is not user message', (done) => {
      request(app)
        .put('/api/v1/chats/1/messages/2')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some message' })
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no such message that you can edit');
        })
        .end(done);
    });
    it('should return 200 and edit message', (done) => {
      request(app)
        .put('/api/v1/chats/1/messages/1')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'some message' })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Your message was edited successfully');
        })
        .end(done);
    });
  });
  describe('delete message controller', () => {});
});
