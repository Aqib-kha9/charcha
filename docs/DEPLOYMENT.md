# CHARCHA – Deployment Guide (GCP Free Tier)

This guide covers deploying CHARCHA to Google Cloud Platform using **only free-tier services**. No paid resources are required.

## Architecture Overview

| Component | Service | Free Tier Limit |
|-----------|---------|-----------------|
| Frontend (Flutter Web PWA) | Firebase Hosting | 10 GB storage, 360 MB/day transfer |
| Backend (Node.js + Express) | Cloud Run | 2 million requests/month, 360k GB-seconds |
| Database (MongoDB) | MongoDB Atlas (external, allowed) | 512 MB storage |
| AI (Gemini) | Google AI Studio API | Free tier (rate limits apply) |

---

## Prerequisites

- A Google account
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- [Docker](https://www.docker.com/) installed (for local container testing, optional)
- Flutter SDK installed
- Node.js v18+ installed

---

## Step 1: GCP Account & Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Sign up for the **Free Tier** (a credit card may be required for verification, but you will not be charged if you stay within free limits).
3. Create a new project:
   - Project name: `charcha-app`
   - Note the **Project ID** (e.g., `charcha-app-123456`).
4. Enable billing alerts to monitor usage (recommended).

---

## Step 2: MongoDB Atlas (Database)

MongoDB Atlas is external to GCP but is allowed for this project.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up (free).
2. Create a **free shared cluster** (M0):
   - Cloud provider: AWS / GCP / Azure (any)
   - Region: prefer `asia-south1` (Mumbai) for low latency
3. Set up database access:
   - Create a database user (username + password).
   - Save these credentials securely.
4. Set up network access:
   - For development: add your IP address.
   - For production: allow access from anywhere (`0.0.0.0/0`) since Cloud Run uses dynamic IPs.
5. Click **Connect** → **Drivers** → copy the connection string.
   - It looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Create a database named `charcha`.

> Store this connection string as `MONGODB_URI` in your backend environment variables.

---

## Step 3: Gemini API Key (AI Layer)

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API Key** → **Create API key**.
4. Copy the generated key (starts with `AIza...`).

> Store this as `GEMINI_API_KEY` in your backend environment variables.

---

## Step 4: Backend Deployment (Cloud Run)

### 4.1 Prepare the Backend

The backend already includes a `Dockerfile` in the `backend/` directory.

### 4.2 Authenticate with GCP

```bash
gcloud auth login
gcloud config set project charcha-app-123456   # use your Project ID
```

### 4.3 Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 4.4 Deploy to Cloud Run

From the `backend/` directory:

```bash
gcloud run deploy charcha-backend \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=5000 \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=3 \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,GEMINI_API_KEY=gemini-key:latest,JWT_SECRET=jwt-secret:latest"
```

> **Note:** For secrets, first create them in Google Secret Manager:
> ```bash
> echo -n "your-mongodb-uri" | gcloud secrets create mongodb-uri --data-file=-
> echo -n "your-gemini-key" | gcloud secrets create gemini-key --data-file=-
> echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
> ```
> Grant the Cloud Run service account access to these secrets.

Alternatively, for a quick hackathon deploy, use `--set-env-vars` for all values (less secure but faster):

```bash
gcloud run deploy charcha-backend \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=5000 \
  --set-env-vars="NODE_ENV=production,MONGODB_URI=your-uri,GEMINI_API_KEY=your-key,JWT_SECRET=your-secret,CLIENT_URL=https://charcha-app.web.app"
```

### 4.5 Get the Backend URL

After deployment, Cloud Run returns a URL like:
```
https://charcha-backend-xxxxx-uc.a.run.app
```

Save this URL — you'll need it for the frontend configuration.

---

## Step 5: Frontend Deployment (Firebase Hosting)

### 5.1 Prepare Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Add a new project → select the **same GCP project** (`charcha-app`).
3. Navigate to **Hosting** → **Get Started**.

### 5.2 Initialize Firebase Locally

From the `frontend/` directory:

```bash
firebase login
firebase init hosting
```

During init:
- Select the existing project (`charcha-app`).
- Public directory: `build/web`
- Single-page app: **Yes**
- Set up automatic builds with GitHub: **No** (or Yes if you want CI/CD)
- File `build/web/index.html` already exists: **Yes** (after first build)

### 5.3 Configure API Base URL

Before building, set the backend URL. Create `frontend/.env`:

```
API_BASE_URL=https://charcha-backend-xxxxx-uc.a.run.app/api
```

Or hardcode in the Flutter config (for hackathon speed).

### 5.4 Build the Flutter Web App

```bash
cd frontend
flutter build web --release
```

The output goes to `build/web/`. This includes the PWA manifest and service worker by default.

### 5.5 Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

You'll receive a URL like:
```
https://charcha-app.web.app
```

This is your **submission link** (frontend).

### 5.6 (Optional) Custom Domain

In Firebase Console → Hosting → Add custom domain (requires domain ownership).

---

## Step 6: Verify the Deployment

1. Open the Firebase Hosting URL (`https://charcha-app.web.app`).
2. The Flutter PWA should load.
3. Test API connectivity:
   ```bash
   curl https://charcha-backend-xxxxx-uc.a.run.app/api/health
   ```
   Expected response: `{"status":"ok",...}`
4. Confirm the frontend can reach the backend (check browser console for CORS errors — the backend is configured to allow the Firebase domain).

---

## Step 7: Submission Checklist

- [ ] Frontend deployed to Firebase Hosting — URL: `https://charcha-app.web.app`
- [ ] Backend deployed to Cloud Run — URL: `https://charcha-backend-xxxxx-uc.a.run.app`
- [ ] MongoDB Atlas cluster running and accessible
- [ ] Gemini API key configured
- [ ] All environment variables set in Cloud Run
- [ ] CORS configured for the Firebase domain
- [ ] GitHub repository public with both frontend and backend code
- [ ] Project description document (Google Doc) with features, tech stack, deployment details, credits

---

## Free Tier Limits & Cost Safety

| Service | Free Limit | CHARCHA Expected Usage |
|---------|-----------|----------------------|
| Firebase Hosting | 10 GB storage, 360 MB/day transfer | < 100 MB (well within) |
| Cloud Run | 2 million requests/month, 360k GB-seconds | Hackathon demo: minimal |
| MongoDB Atlas | 512 MB storage | Sufficient for demo data |
| Gemini API | Free tier with rate limits | Sufficient for demo |

**Tip:** Set up billing alerts in GCP to get notified if you approach limits.

---

## Troubleshooting

### Cloud Run deployment fails
- Ensure the Dockerfile is valid: `docker build -t charcha-backend .` locally first.
- Check that all required APIs are enabled.
- Verify the service account has permissions.

### CORS errors in browser
- Ensure `CLIENT_URL` env var in backend matches your Firebase Hosting URL.
- The backend CORS middleware must allow the Firebase domain.

### MongoDB connection fails
- Check network access allows `0.0.0.0/0` for Cloud Run.
- Verify the connection string and credentials.
- Ensure the database user has read/write permissions.

### Flutter web build issues
- Run `flutter clean` then `flutter pub get` before building.
- Ensure `flutter build web` completes without errors.

### Firebase deploy fails
- Run `firebase login` to re-authenticate.
- Ensure the public directory (`build/web`) exists (run `flutter build web` first).

---

## Rollback

### Cloud Run
```bash
gcloud run services describe charcha-backend --region=us-central1
# List revisions and roll back to a previous one via Console UI
```

### Firebase Hosting
- Firebase keeps version history. Roll back via Console → Hosting → Version history.
