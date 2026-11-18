const { beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const firebaseAdmin = require('firebase-admin');

const users = new Map();
const authUsers = new Map();
let authUpdateError = null;
let tokenUid = 'disabled-user';

const userReference = id => ({
  get: async () => ({
    id,
    exists: users.has(id),
    data: () => users.get(id)
  }),
  set: async (data, options) => {
    users.set(id, options?.merge ? { ...users.get(id), ...data } : data);
  }
});

Object.defineProperty(firebaseAdmin, 'firestore', { configurable: true, value: () => ({
  collection: name => {
    assert.equal(name, 'users');
    return { doc: userReference };
  }
}) });

Object.defineProperty(firebaseAdmin, 'auth', { configurable: true, value: () => ({
  updateUser: async (id, updates) => {
    if (authUpdateError) throw authUpdateError;
    authUsers.set(id, { ...authUsers.get(id), ...updates });
  },
  verifyIdToken: async () => ({ uid: tokenUid })
}) });

const { updateUserStatus } = require('../controllers/admin');
const { protect } = require('../middleware/auth');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

beforeEach(() => {
  users.clear();
  authUsers.clear();
  authUpdateError = null;
  tokenUid = 'disabled-user';
  users.set('disabled-user', { role: 'student', disabled: false });
  authUsers.set('disabled-user', { disabled: false });
});

test('disabling and reactivating updates Firebase Auth and Firestore', async () => {
  const res = response();
  await updateUserStatus({ body: { disabled: true }, params: { id: 'disabled-user' }, user: { id: 'admin' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(users.get('disabled-user').disabled, true);
  assert.equal(authUsers.get('disabled-user').disabled, true);

  const reactivationResponse = response();
  await updateUserStatus({ body: { disabled: false }, params: { id: 'disabled-user' }, user: { id: 'admin' } }, reactivationResponse);

  assert.equal(reactivationResponse.statusCode, 200);
  assert.equal(users.get('disabled-user').disabled, false);
  assert.equal(authUsers.get('disabled-user').disabled, false);
});

test('prevents self-disable and rejects a missing user', async () => {
  const selfResponse = response();
  await updateUserStatus({ body: { disabled: true }, params: { id: 'admin' }, user: { id: 'admin' } }, selfResponse);
  assert.equal(selfResponse.statusCode, 400);

  const missingResponse = response();
  await updateUserStatus({ body: { disabled: true }, params: { id: 'missing' }, user: { id: 'admin' } }, missingResponse);
  assert.equal(missingResponse.statusCode, 404);
});

test('keeps a failed disable blocked in Firestore and reports the Auth failure', async () => {
  authUpdateError = new Error('Auth unavailable');
  const res = response();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await updateUserStatus({ body: { disabled: true }, params: { id: 'disabled-user' }, user: { id: 'admin' } }, res);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 503);
  assert.equal(users.get('disabled-user').disabled, true);
  assert.equal(authUsers.get('disabled-user').disabled, false);
});

test('rejects API access when the Firestore user is disabled', async () => {
  users.set('disabled-user', { role: 'student', disabled: true });
  const req = { headers: { authorization: 'Bearer test-token' } };
  const res = response();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'This account has been disabled');
  assert.equal(nextCalled, false);
});
