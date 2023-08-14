// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const User = require('../models/user.models');
const Chat = require('../models/chat.models');
const DeletedConversation = require('../models/deletedConversation.models');

const baseUrl = '/api/v1/chats';

const createUser = async (text) =>
  await User.create({
    email: `${text}@test.com`,
    password: 'password',
    firstName: text,
    lastName: text,
    bio: text,
    isActive: true,
  });

describe('/conversations route', () => {
  let token1;
  let token3;
  let token4;
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    await redisConnect();
    const user1 = await createUser('test1');
    await createUser('test2');
    await createUser('test3');
    await createUser('test4');
    const user5 = await createUser('test5');
    const conversation = await Chat.create({
      type: 'private',
      creatorId: user1.dataValues.id,
      title: undefined,
    });
    conversation.addUser(user1.dataValues.id, { through: { role: 'user' } });
    conversation.addUser(user5.dataValues.id, { through: { role: 'user' } });
    await conversation.save();
    await DeletedConversation.create({
      userId: user1.dataValues.id,
      conversationId: conversation.dataValues.id,
    });

    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test1@test.com', password: 'password' });
    token1 = res.body.token;
    const res2 = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test3@test.com', password: 'password' });
    token3 = res2.body.token;
    const res3 = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'test4@test.com', password: 'password' });
    token4 = res3.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
    await redisDisconnect();
  });
  describe('/private route for creating conversation', () => {
    it('should return 401 as user is not logged in', (done) => {
      request(app)
        .post(`/api/v1/users/${1}/chats/private`)
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 400 as user is trying to begin a conversation with himself', (done) => {
      request(app)
        .post(`/api/v1/users/${1}/chats/private`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe("You can't start conversation with yourself");
        })
        .end(done);
    });
    it('should return 404 as there is not such user', (done) => {
      request(app)
        .post(`/api/v1/users/${1000}/chats/private`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no user with such id');
        })
        .end(done);
    });
    it('should return 201 and create a conversation', (done) => {
      request(app)
        .post(`/api/v1/users/${2}/chats/private`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation was created successfully');
        })
        .end(done);
    });
    it('should return 400 as conversation with this user already exists', (done) => {
      request(app)
        .post(`/api/v1/users/${2}/chats/private`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation with this user is already exists');
        })
        .end(done);
    });
    it('should return 201 and create a conversation', (done) => {
      request(app)
        .post(`/api/v1/users/${2}/chats/private`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token3}`)
        .send()
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversation was created successfully');
        })
        .end(done);
    });
  });
  describe('/group', () => {
    it('should return 401 as user is not logged in', (done) => {
      request(app)
        .post('/api/v1/chats/group')
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 201 and create a group chat', (done) => {
      request(app)
        .post('/api/v1/chats/group')
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Group conversation was created successfully');
        })
        .end(done);
    });
  });
  describe('/:chatId', () => {
    it('should return 401 as user is not logged in', (done) => {
      request(app)
        .patch(`/api/v1/chats/${1}`)
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 403 and create a group chat', (done) => {
      request(app)
        .patch(`/api/v1/chats/${1}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token3}`)
        .send()
        .expect(403)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('This conversation is not your');
        })
        .end(done);
    });
  });
  describe('/ route for getting all conversations', () => {
    it('should return 401 there was no token provided', (done) => {
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
    it('should return 200 and empty array of conversations as user does not participate in any', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token4}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe("This user doesn't participate in any conversations");
          expect(res.body.data.chats).toEqual([]);
        })
        .end(done);
    });
    it('should return 200 and return list of conversations', (done) => {
      request(app)
        .get(baseUrl)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Conversations were found');
          expect(res.body.data.chats.length).toBe(1);
          expect(res.body.data.chats[0].creatorId).toBe(1);
        })
        .end(done);
    });
  });
  describe('/:conversationId delete route', () => {
    it('should return 401 as there was no token provided', (done) => {
      request(app)
        .delete(`${baseUrl}/${1}`)
        .type('json')
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 404 as there is no conversation for provided id', (done) => {
      request(app)
        .delete(`${baseUrl}/${1000}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no such conversation');
        })
        .end(done);
    });
    it('should return 400 as there is no conversation for this user', (done) => {
      request(app)
        .delete(`${baseUrl}/${3}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no such conversation for selected user');
        })
        .end(done);
    });
    it('should return 204 and delete conversation', (done) => {
      request(app)
        .delete(`${baseUrl}/${2}`)
        .type('json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(200)
        .end(done);
    });
    it('should return 400 as conversation with provided id for current user is already deleted', (done) => {
      request(app)
        .delete(`${baseUrl}/${2}`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token1}`)
        .send()
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('This conversation is already deleted');
        })
        .end(done);
    });
  });
});
