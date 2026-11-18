const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const admin = require('firebase-admin');

// Load env vars before initializing services.
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const fs = require('fs');
  const serviceAccountPath = path.resolve(__dirname, 'service-account.json');
  const firebaseOptions = { projectId: 'placeiq-2026-669b7fee' };
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    firebaseOptions.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  }

  if (fs.existsSync(serviceAccountPath)) {
    console.log('Using local service-account.json for Firebase Admin');
    firebaseOptions.credential = admin.credential.cert(serviceAccountPath);
  } else {
    console.warn('Warning: service-account.json not found. Falling back to default credentials.');
    firebaseOptions.credential = admin.credential.applicationDefault();
  }
  admin.initializeApp(firebaseOptions);
}

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
// app.use('/api/auth', require('./routes/auth')); // Disabled in favor of Firebase Auth on client
app.use('/api/resume', require('./routes/resume'));
app.use('/api/students', require('./routes/students'));
app.use('/api/tpo', require('./routes/tpo'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/recruiters', require('./routes/recruiters'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/jobs', require('./routes/job'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PlaceIQ API' });
});

// Connect to database
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
