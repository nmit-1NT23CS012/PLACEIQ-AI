const { test } = require('node:test');
const assert = require('node:assert/strict');
const Application = require('../models/Application');
const { getApplications } = require('../controllers/applications');

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

test('recruiters cannot list the legacy application collection', async () => {
  const originalFind = Application.find;
  let queryExecuted = false;
  Application.find = () => {
    queryExecuted = true;
    throw new Error('Application query should not run for recruiters');
  };

  const res = response();
  try {
    await getApplications({ user: { id: 'recruiter-1', role: 'recruiter' } }, res);
  } finally {
    Application.find = originalFind;
  }

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.equal(queryExecuted, false);
});
