# PlaceIQ AI — Frontend

This folder contains the React/Vite dashboard for PlaceIQ AI. The student, recruiter, and administrator views use Firebase Authentication and the PlaceIQ backend API.

## Run from the project root

See the root [README](../README.md) for the complete Windows setup guide, Firebase configuration, and instructions to start the frontend, backend, and AI service together.

For frontend-only development, install dependencies from this folder and run:

```powershell
npm install
npm run dev
```

Set `VITE_API_URL` in a client `.env` file if the backend is not at `http://localhost:5000/api`.

## Account roles

- Students and recruiters can register from the login screen.
- Admin registration is intentionally unavailable. An administrator must provision the Firebase Auth account and assign `role: "admin"` to its matching `users/{uid}` Firestore document.
- Firebase rules restrict users to reading their own user record and prevent client-side role or access-status changes.

## Build

```powershell
npm run build
```
