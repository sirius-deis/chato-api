// eslint-disable-next-line node/no-unpublished-require
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/db.config');
const ActivateToken = require('../models/activateToken.models');
const User = require('../models/user.models');

const baseUrl = '/api/v1/users/';

describe('/users route', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync();
  });
  afterAll(async () => {
    await sequelize.close();
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
    it('should return 201 after successful registration', (done) => {
      request(app)
        .post(`${baseUrl}signup`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test2@test.com', password: 'password', passwordConfirm: 'password' })
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
        .then((token) => {
          request(app)
            .get(`${baseUrl}activate/${token.dataValues.token}`)
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
        .send({ email: 'test2@test.com', password: 'password' })
        .expect(403)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Your account is deactivated. Please reactivate your account and then try again',
          );
        })
        .end(done);
    });
    it('should return 200 and login', (done) => {
      request(app)
        .post(`${baseUrl}login`)
        .type('json')
        .set('Accept', 'application/json')
        .send({ email: 'test@test.com', password: 'password' })
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).toBe('You were logged in successfully');
          expect(res.body.date.user.email).toBe('test@test.com');
          expect(res.body.date.user.password).toBeUndefined();
          expect(res.body.date.user.isBlocked).toBeUndefined();
          expect(res.body.date.user.passwordChangedAt).toBeUndefined();
        })
        .end(done);
    });
  });
});
