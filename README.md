# PlaceIQ AI

PlaceIQ AI is a campus placement platform for students, recruiters, and placement administrators. Students can upload resumes for AI-assisted analysis, explore job matches, and track applications. Recruiters can post jobs and review applicants.

## Features

- Firebase Authentication and Firestore-backed user profiles
- Resume parsing for PDF and DOCX files
- AI-assisted readiness scoring, skill-gap insights, and job matching
- Student, recruiter, and administrator dashboards
- Recruiter job postings and application tracking
- Node.js/Express API and a Python/FastAPI analysis service

## Technology

- Frontend: React, Vite, Tailwind CSS
- API: Node.js, Express, Firebase Admin
- AI service: Python, FastAPI, Sentence Transformers
- Data: Firebase Firestore; MongoDB-backed legacy features
- Optional container setup: Docker Compose and Nginx

## Requirements

- Windows 10/11 with PowerShell
- Node.js 20 or 22 and npm
- Python 3.11 and the Windows `py` launcher
- A Firebase project with Authentication and Cloud Firestore enabled

## Setup

1. Install Node dependencies from the repository root:

   ```powershell
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Configure Firebase for the frontend. Copy the example file and fill in the web app values from your Firebase project:

   ```powershell
   Copy-Item client\.env.example client\.env
   ```

   Set each `VITE_FIREBASE_*` value in `client/.env`. These values are used to identify the Firebase web app; they are not substitutes for Firebase Authentication, Firestore rules, or API-key restrictions. Do not put service-account credentials or other server secrets in `VITE_*` variables.

3. Configure the backend:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

   The example uses an in-memory MongoDB for local development. For Firebase Admin access, either put a service-account JSON file at `server/service-account.json` or configure Google Application Default Credentials. Never commit or share the service-account file.

4. Create the AI-service environment and install Python dependencies:

   ```powershell
   py -3.11 -m venv ai-service\venv
   & .\ai-service\venv\Scripts\python.exe -m pip install --upgrade pip
   & .\ai-service\venv\Scripts\python.exe -m pip install -r ai-service\requirements.txt
   ```

## Run locally

From the repository root:

```powershell
npm start
```

The application starts the frontend at `http://localhost:5173`, the API at `http://localhost:5000`, and the AI service at `http://localhost:8000`. The AI service may download its model the first time it starts.

Stop the processes with **Ctrl+C** in the terminal running `npm start`. The optional `npm stop` command terminates processes listening on ports 5000, 5173, and 8000; use it only if those ports belong to this project.

## Firebase setup

- Enable Email/Password sign-in in Firebase Authentication. Configure other sign-in providers in the Firebase Console if needed.
- Deploy the included Firestore rules and indexes with the Firebase CLI, or configure them in the Firebase Console.
- Students and recruiters register in the app. To create an administrator, create the Firebase Authentication user and the matching `users/{uid}` Firestore document with `name`, `email`, `role: "admin"`, and `createdAt`. Admin accounts cannot self-register.
- For Firebase Storage resume storage, set `RESUME_STORAGE_PROVIDER=firebase` and `FIREBASE_STORAGE_BUCKET` in `server/.env`. The service account needs the required bucket permissions.
- By default, application resumes are stored privately under `server/private-resumes`. This folder is local to the backend and is excluded from Git.

## Docker Compose

The optional Docker Compose setup starts MongoDB, the API, AI service, frontend, and Nginx. Configure Firebase Admin credentials for the backend before using authenticated features. The Compose MongoDB volume persists data locally.

```powershell
docker compose up --build
```

## Tests and build

Run backend tests and build the frontend:

```powershell
npm test
```

With the API and AI service running, run the read-only local smoke checks:

```powershell
python e2e_validation.py
```

## Repository safety

Local `.env` files, service-account credentials, dependency folders, generated output, test credentials, and uploaded/private resumes are excluded by `.gitignore`. Keep real credentials in local environment files or a secrets manager, never in source code or `VITE_*` variables.
