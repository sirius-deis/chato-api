// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const { redisConnect, redisDisconnect } = require('../db/redis.config');
const ActivateToken = require('../models/activateToken.models');
const User = require('../models/user.models');

const baseUrl = '/api/v1/users/';

describe('/users route', () => {
  let token;
  let token2;
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();
    await redisConnect();
    await User.create({
      email: 'test2@test.com',
      password: 'password',
      firstName: 'test2',
      lastName: 'test2',
      bio: 'test2',
      isActive: true,
    });
    await User.create({ email: 'test3@test.com', password: 'password' });
    await User.create({ email: 'test4@test.com', password: 'password', isActive: true, isBlocked: true });
  });
  afterAll(async () => {
    await sequelize.close();
    await redisDisconnect();
  });

  describe('/signup route ', () => {
    it('should return 400 as body values are empty', (done) => {
      request(app)
        .post(`${baseUrl}signup`)
        .type('json')
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            'Provide valid email',
            "Field: password can't be empty",
            "Field: passwordConfirm can't be empty",
            "Field: password can't be shorter than 4 length",
            "Field: passwordConfirm can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
    it('should return 400 as password and passwordConfirm are too short', (done) => {
      request(app)
        .post(`${baseUrl}signup`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'pas', passwordConfirm: 'pas' })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            "Field: password can't be shorter than 4 length",
            "Field: passwordConfirm can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
    it('should return 400 as password and passwordConfirm are not the same', (done) => {
      request(app)
        .post(`${baseUrl}signup`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'password', passwordConfirm: 'password1' })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Password are not the same. Please provide correct passwords');
        })
        .end(done);
    });
    it('should return 201 after successful registration', (done) => {
      request(app)
        .post(`${baseUrl}signup`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'password', passwordConfirm: 'password' })
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Your account was created successfully. Please check your email and confirm your account, and then you will be able to use our service',
          );
        })
        .end(done);
    });
  });
  describe('/activate route ', () => {
    it('should return 404 as token does not exist', (done) => {
      request(app)
        .get(`${baseUrl}activate/1`)
        .type('json')
        .send({})
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Token does not exist. Please check if it is correct');
        })
        .end(done);
    });
    it('should return 200 and activate account', (done) => {
      User.findOne({ where: { email: 'test@test.com' } })
        .then((user) => ActivateToken.findOne({ where: { user_id: user.dataValues.id } }))
        .then((activateToken) => {
          request(app)
            .get(`${baseUrl}activate/${activateToken.dataValues.token}`)
            .type('json')
            .send({})
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => {
              expect(res.body.message).toBe('Your account was successfully verified. Please login and enjoy chatting');
            })
            .end(done);
        });
    });
  });
  describe('/login route ', () => {
    it('should return 400 as body values are empty', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            'Provide valid email',
            "Field: password can't be empty",
            "Field: password can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
    it('should return 400 as password is too short', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'pas' })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual(["Field: password can't be shorter than 4 length"]);
        })
        .end(done);
    });
    it('should return 401 as password is incorrect', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'dontexist@test.com', password: 'password' })
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Wrong email or password');
        })
        .end(done);
    });
    it('should return 401 as password is incorrect', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'password-incorrect' })
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Wrong email or password');
        })
        .end(done);
    });
    it('should return 403 as account is deactivated', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test3@test.com', password: 'password' })
        .expect(403)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Your account is deactivated. Please reactivate your account and then try again',
          );
        })
        .end(done);
    });
    it('should return 403 as account is blocked', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test4@test.com', password: 'password' })
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Your account is blocked');
        })
        .end(done);
    });
    it('should return 200 and login user', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'password' })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('You were logged in successfully');
          expect(res.body.data.user.email).toBe('test@test.com');
          expect(res.body.data.user.password).toBeUndefined();
          expect(res.body.data.user.isBlocked).toBeUndefined();
          expect(res.body.data.user.passwordChangedAt).toBeUndefined();
          // eslint-disable-next-line prefer-destructuring
          token = res.body.token;
        })
        .end(done);
    });
    it('should return 200 and login user', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test2@test.com', password: 'password' })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('You were logged in successfully');
          expect(res.body.data.user.email).toBe('test2@test.com');
          expect(res.body.data.user.password).toBeUndefined();
          expect(res.body.data.user.isBlocked).toBeUndefined();
          expect(res.body.data.user.passwordChangedAt).toBeUndefined();
          token2 = res.body.token;
        })
        .end(done);
    });
  });
  describe('/update route', () => {
    it('should return 401 as there is no token', (done) => {
      request(app)
        .patch(`${baseUrl}update`)
        .type('json')
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 400 as body value are too short', (done) => {
      request(app)
        .patch(`${baseUrl}update`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'f',
          lastName: 'l',
          bio: ':)',
        })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            "Field: firstName can't be shorter than 4 length",
            "Field: lastName can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
    it('should return 400 as there were no field provided for update', (done) => {
      request(app)
        .patch(`${baseUrl}update`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual('Please provide some information to change');
        })
        .end(done);
    });
    it('should return 200 and update info', (done) => {
      request(app)
        .patch(`${baseUrl}update`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'test',
          lastName: 'test',
          bio: 'test',
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual('Your data was updated successfully');
        })
        .end(done);
    });
    it('should return 200 and update info', (done) => {
      request(app)
        .patch(`${baseUrl}update`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          bio: ':)',
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual('Your data was updated successfully');
        })
        .end(done);
    });
  });
  describe('/:userId route', () => {
    it('should return 401 as there is not token', (done) => {
      request(app)
        .get(`${baseUrl}1`)
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
    it('should return 500 as token format is incorrect', (done) => {
      request(app)
        .get(`${baseUrl}1`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', '123')
        .send()
        .expect(500)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Something went wrong, please try again later');
        })
        .end(done);
    });
    it('should return 401 as token is malformed', (done) => {
      request(app)
        .get(`${baseUrl}1`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 123')
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Token verification failed. Token is malformed');
        })
        .end(done);
    });
    it('should return 401 as token is incorrect', (done) => {
      request(app)
        .get(`${baseUrl}1`)
        .type('json')
        .set('Accept', 'application/json')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        )
        .send()
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Token verification failed. Token is malformed');
        })
        .end(done);
    });
    it('should return 200 and return user info for current user', (done) => {
      request(app)
        .get(`${baseUrl}4`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Data was retrieved successfully');
          expect(res.body.data.user.id).toBe(4);
          expect(res.body.data.user.phone).toBeNull();
          expect(res.body.data.user.email).toBe('test@test.com');
          expect(res.body.data.user.firstName).toBe('test');
          expect(res.body.data.user.lastName).toBe('test');
          expect(res.body.data.user.bio).toBe('test');
        })
        .end(done);
    });
    it('should return 404 as there is no such user', (done) => {
      request(app)
        .get(`${baseUrl}100`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(404)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('There is no user with such id');
        })
        .end(done);
    });
    it('should return 200 and return user info for not current user', (done) => {
      request(app)
        .get(`${baseUrl}1`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Data was retrieved successfully');
          expect(res.body.data.user.id).toBe(1);
          expect(res.body.data.user.phone).toBeUndefined();
          expect(res.body.data.user.email).toBeUndefined();
          expect(res.body.data.user.firstName).toBe('test2');
          expect(res.body.data.user.lastName).toBeUndefined();
          expect(res.body.data.user.bio).toBe(':)');
        })
        .end(done);
    });
  });
  describe('/update-password route', () => {
    it('should return 401 as there is not token', (done) => {
      request(app)
        .get(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .send({})
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('Sign in before accessing this route');
        })
        .end(done);
    });
    it('should return 400 as body values are incorrect', (done) => {
      request(app)
        .patch(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            "Field: password can't be empty",
            "Field: passwordConfirm can't be empty",
            "Field: currentPassword can't be empty",
            "Field: password can't be shorter than 4 length",
            "Field: passwordConfirm can't be shorter than 4 length",
            "Field: currentPassword can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
    it('should return 400 as body values are too short', (done) => {
      request(app)
        .patch(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'pas',
          passwordConfirm: 'pas',
          currentPassword: 'pas',
        })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual([
            "Field: password can't be shorter than 4 length",
            "Field: passwordConfirm can't be shorter than 4 length",
            "Field: currentPassword can't be shorter than 4 length",
          ]);
        })
        .end(done);
    });
    it('should return 401 as current password is incorrect', (done) => {
      request(app)
        .patch(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'password123',
          passwordConfirm: 'password123',
          currentPassword: 'password1',
        })
        .expect(401)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual('Incorrect password');
        })
        .end(done);
    });
    it('should return 400 as current password and a new one are the same', (done) => {
      request(app)
        .patch(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'password',
          passwordConfirm: 'password',
          currentPassword: 'password',
        })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual("New password can't be the same as the current one");
        })
        .end(done);
    });
    it('should return 400 as password and confirm password are not the same', (done) => {
      request(app)
        .patch(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'password123',
          passwordConfirm: 'password1',
          currentPassword: 'password',
        })
        .expect(400)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual('Passwords are different');
        })
        .end(done);
    });
    it('should return 200 and change password', (done) => {
      request(app)
        .patch(`${baseUrl}update-password`)
        .type('json')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'password123',
          passwordConfirm: 'password123',
          currentPassword: 'password',
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toEqual('You password was successfully updated');
          expect(res.body.token).not.toBeUndefined();
        })
        .end(done);
    });
  });
});
