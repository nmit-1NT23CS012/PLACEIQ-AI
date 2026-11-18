const { test } = require('node:test');
const assert = require('node:assert/strict');
const firebaseAdmin = require('firebase-admin');
const aiService = require('../utils/aiService');

const profiles = new Map([
  ['active-user', { user: 'active-user', skills: ['Python'], readinessScore: 80 }],
  ['disabled-user', { user: 'disabled-user', skills: ['SQL'], readinessScore: 90 }],
  ['orphan-user', { user: 'orphan-user', skills: ['React'], readinessScore: 70 }]
]);
const users = new Map([
  ['active-user', { name: 'Active Candidate', email: 'active@example.com' }],
  ['disabled-user', { name: 'Disabled Candidate', email: 'disabled@example.com', disabled: true }]
]);

const documentReference = (collection, id) => ({
  get: async () => {
    const records = collection === 'users' ? users : profiles;
    return {
      id,
      exists: records.has(id),
      data: () => records.get(id)
    };
  }
});

Object.defineProperty(firebaseAdmin, 'firestore', {
  configurable: true,
  value: () => ({
    collection: collection => ({
      get: async () => {
        const records = collection === 'users' ? users : profiles;
        const docs = [...records.entries()].map(([id, value]) => ({
          id,
          data: () => value
        }));
        return { docs, empty: docs.length === 0 };
      },
      doc: id => documentReference(collection, id),
      where: () => ({
        limit: () => ({
          get: async () => ({ docs: [] })
        })
      })
    })
  })
});

const { getRecruiterCandidates, matchJD, getCandidateDetail } = require('../controllers/recruiters');

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

test('recruiter candidate listings and AI matching exclude disabled and orphaned accounts', async () => {
  const listResponse = response();
  await getRecruiterCandidates({}, listResponse);
  assert.deepEqual(listResponse.body.data.map(candidate => candidate.id), ['active-user']);

  const originalMatchCandidates = aiService.matchCandidates;
  aiService.matchCandidates = async (_job, candidates) => candidates.map(candidate => ({ id: candidate.id, score: 80 }));
  try {
    const matchResponse = response();
    await matchJD({ body: { description: 'Python engineer' } }, matchResponse);
    assert.deepEqual(matchResponse.body.data.map(candidate => candidate.id), ['active-user']);
  } finally {
    aiService.matchCandidates = originalMatchCandidates;
  }
});

test('recruiters cannot fetch a disabled candidate profile', async () => {
  const res = response();
  await getCandidateDetail({ params: { id: 'disabled-user' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'Candidate profile not found');
});
