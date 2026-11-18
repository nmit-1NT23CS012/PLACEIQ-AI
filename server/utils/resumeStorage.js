const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const localStorageDirectory = path.resolve(__dirname, '..', 'private-resumes');

const storageError = message => {
  const error = new Error(message);
  error.code = 'RESUME_STORAGE_NOT_CONFIGURED';
  return error;
};

const getProvider = () => {
  const configuredProvider = process.env.RESUME_STORAGE_PROVIDER;
  if (configuredProvider && !['local', 'firebase'].includes(configuredProvider)) {
    throw storageError('RESUME_STORAGE_PROVIDER must be local or firebase.');
  }
  return configuredProvider || 'local';
};

const getBucket = () => {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw storageError('Set FIREBASE_STORAGE_BUCKET to use Firebase resume storage.');
  }
  return admin.storage().bucket(bucketName);
};

const createStoragePath = (userId, originalName) => {
  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'resume';
  return `resumes/${safeUserId}/applications/${crypto.randomUUID()}-${safeFileName}`;
};

const getLocalFilePath = storagePath => {
  const filePath = path.resolve(localStorageDirectory, ...storagePath.split('/'));
  if (!filePath.startsWith(`${localStorageDirectory}${path.sep}`)) {
    throw new Error('Invalid stored resume path.');
  }
  return filePath;
};

exports.storeResume = async ({ tempFilePath, userId, originalName, contentType }) => {
  const provider = getProvider();
  const storagePath = createStoragePath(userId, originalName);

  if (provider === 'local') {
    const destination = getLocalFilePath(storagePath);
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.rename(tempFilePath, destination);
  } else {
    await getBucket().file(storagePath).save(await fs.promises.readFile(tempFilePath), {
      resumable: false,
      metadata: { contentType }
    });
  }

  return { provider, storagePath };
};

exports.deleteResume = async (provider, storagePath) => {
  if (provider === 'local') {
    await fs.promises.unlink(getLocalFilePath(storagePath));
    return;
  }
  await getBucket().file(storagePath).delete();
};

exports.getResumeReadStream = async (provider, storagePath) => {
  if (provider === 'local') {
    const filePath = getLocalFilePath(storagePath);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    return fs.createReadStream(filePath);
  }

  const file = getBucket().file(storagePath);
  const [exists] = await file.exists();
  return exists ? file.createReadStream() : null;
};
