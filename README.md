# CHARCHA – AI-Powered Hyperlocal Civic Intelligence Platform

> **Mohalle Se Mantralay Tak** — Building trust between citizens and local authorities through AI-powered transparency, intelligent reporting, and hyperlocal civic intelligence.

CHARCHA is an AI-powered civic intelligence platform that transforms local discussions into verified public action. It is a smart civic software layer that understands the issue, identifies the right authority, eliminates duplicate noise, verifies truth, and transforms local problems into visible community action.

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem Landscape](#2-the-problem-landscape--10-realworld-challenges)
3. [Core Product Positioning](#3-core-product-positioning)
4. [Stakeholders](#4-stakeholders)
5. [Feature Architecture](#5-feature-architecture)
6. [How CHARCHA Solves the 10 Core Problems](#6-how-charcha-solves-the-10-core-problems)
7. [Demo Walkthrough](#7-demo-walkthrough)
8. [Why CHARCHA Stands Out](#8-why-charcha-stands-out)
9. [Technical Approach](#9-technical-approach)
10. [Project Structure](#10-project-structure)
11. [Getting Started](#11-getting-started)
12. [Deployment Plan (GCP)](#12-deployment-plan-gcp)
13. [Environment Variables](#13-environment-variables)
14. [Roadmap](#14-roadmap)
15. [Conclusion](#15-conclusion)

---

## 1. Executive Summary

CHARCHA is an AI-powered civic intelligence platform that transforms local discussions into verified public action. It is a smart civic software layer that understands the issue, identifies the right authority, eliminates duplicate noise, verifies truth, and transforms local problems into visible community action.

In a landscape where civic reporting is fragmented, untrusted, and often ignored, CHARCHA provides a complete end-to-end system that:

- Reduces user effort through AI-powered issue detection and auto-categorisation
- Prevents duplicate and fake reports through multi-layer verification
- Automatically routes issues to the correct department
- Displays full issue life-cycle transparency so citizens never feel their voice disappears
- Provides an authority directory that educates citizens about local governance
- Gives authorities a clean, prioritised dashboard of actionable issues
- Enables anonymous reporting for sensitive cases, protecting citizens from retaliation
- Creates a civic reputation system that rewards genuine impact, not spam
- Ensures users return through hyperlocal civic alerts and updates
- Introduces resolution evidence so the community can verify whether an issue is truly fixed

> **Core Insight:** *"Citizens don't stop reporting because they don't care. They stop reporting because reporting feels invisible and ineffective. CHARCHA makes civic action visible, trackable, and accountable."*

---

## 2. The Problem Landscape – 10 Real-World Challenges

Current civic issue reporting systems fail because they do not solve the real operational and trust problems behind local governance. We have identified ten core challenges that ordinary complaint apps ignore. CHARCHA is designed to solve all of them together.

| # | Challenge | Reality |
|---|-----------|---------|
| 1 | Duplicate Reports | One pothole → 100 people report it → Authority sees 100 complaints, not 1 issue. |
| 2 | Fake Reports | Users upload old photos, wrong locations, or non-issue images; authority trust collapses. |
| 3 | Spam Reporting | A single user creates 500 reports; system gets flooded with noise. |
| 4 | Political Misuse | Coordinated mass reporting targets an area or an official for non-genuine reasons. |
| 5 | Authorities Ignoring Complaints | No public pressure → no accountability → complaints disappear without action. |
| 6 | User Retention | Citizen installs app → submits 1 report → never opens again because there is no reason to return. |
| 7 | Wrong Department Assignment | Garbage issue routed to water department → delay, frustration. |
| 8 | No Prioritisation | 500 complaints, all treated equally; critical issues get buried. |
| 9 | Privacy & Safety Risk | Reporter's name and exact location exposed; risk of harassment, retaliation, or political targeting. |
| 10 | Authority Adoption Barrier | Authorities already receive complaints via WhatsApp, email, call centres, registers. Why would they use a new app? |

---

## 3. Core Product Positioning

> *"Building trust between citizens and local authorities through AI-powered transparency, intelligent reporting, community validation, anonymous reporting, and hyperlocal civic intelligence."*

This positioning makes CHARCHA fundamentally different because we are not just collecting complaints – we are:

- Understanding the issue
- Reducing friction for both citizens and authorities
- Preventing duplicate noise
- Routing correctly
- Showing progress publicly
- Enabling community participation
- Protecting citizens who need anonymity
- Creating a compelling reason for users to keep coming back
- Building long-term civic trust through verified resolution evidence

---

## 4. Stakeholders

### 4.1 Citizen
Primary user. Reports issues, tracks progress, supports and verifies others' reports, builds a civic reputation, stays informed about their neighbourhood, and can report anonymously.

### 4.2 Authorities
Resolution layer. Receive structured, categorised, pre-validated, and prioritised issues. Update status, upload resolution evidence, and focus on high-impact problems.

### 4.3 Community
Validation and amplification layer. Confirms genuine issues, suppresses duplicates, sees area-specific impact, and participates in collective accountability.

---

## 5. Feature Architecture

We have structured the platform into three phases. Phase 1 is the must-build for the hackathon MVP; Phase 2 is to be built if time permits; Phase 3 is the long-term vision shown in the presentation.

### 5.1 PHASE 1 – Core MVP (Must Build)

#### 5.1.1 Authentication
Simple, secure onboarding for citizens and authorities. Features: Registration, login, profile creation, location permission. **Why:** Identity layer for personalisation, trust, and location-aware intelligence.

#### 5.1.2 AI Issue Reporting (The Brain)
User uploads an image. The system automatically:
- Detects issue category (Pothole, Garbage, Water Leakage, Broken Streetlight, Public Infrastructure Damage)
- Generates a title
- Writes a description
- Estimates severity level
- Suggests the responsible department

**Why:** Transforms a dumb upload into an immediately actionable, structured report. Reduces user effort drastically. Makes the report instantly usable for authorities.

#### 5.1.3 Anonymous Reporting
Citizens can choose Public Report or Anonymous Report. Public: name visible on the issue (optional). Anonymous: identity hidden from public feed; only system holds backend accountability data. Public feed shows "Community Member" or "Verified Citizen". **Why:** Protects reporters of sensitive or politically charged issues, increasing participation in difficult cases. Our principle: *"We prioritise issue visibility, not reporter visibility."*

#### 5.1.4 Location Detection
Auto-captures GPS coordinates, stores latitude/longitude, area name, and displays issue on a map. **Why:** Turns a text complaint into actionable geo-tagged civic data. Hyperlocal intelligence is impossible without location.

#### 5.1.5 Community Feed
Public, structured timeline of all reported issues showing: image, category, location, severity, current status, anonymous tag if applicable. **Why:** Creates transparency. Citizens discover existing issues and avoid creating duplicates. Public visibility puts healthy pressure on authorities.

#### 5.1.6 Community Verification & Support System
Instead of just a "Support" button, we offer two distinct community actions that serve different purposes:
- **Confirm Issue Exists** – "I have physically seen this issue." This validates the report's reality.
- **Support Issue** – "This issue is important and should be resolved quickly." This adds public demand weight.

The feed displays both counts separately: "12 confirmed, 87 supporters." **Why:** Converts duplicate complaints into structured social validation. Confirmation builds trust in the report's authenticity; support amplifies its urgency.

#### 5.1.7 Issue Tracking (Full Lifecycle Transparency)
Every issue follows a visible status pipeline: `Reported → Verified → Assigned → In Progress → Resolved`. A detailed timeline is visible to all. **Why:** Solves the #1 trust problem – "Did my complaint disappear or is it actually being worked on?"

#### 5.1.8 Authority Directory (Discovery & Trust Layer)
Displays local governance information: PWD, Nagar Nigam, Jal Nigam, Electricity Department, etc. For each, shows department name, responsibility area, contact details. **MVP Data Strategy:** We use mock data for demonstration. **Production Vision:** Official municipal datasets, government APIs, verified local directories, and community-verified updates. **Why:** The directory serves as a discovery layer that attracts users who just want governance information, and then they stay for reporting and tracking.

#### 5.1.9 Authority Dashboard
A clean, operational panel for officers showing total issues, active, resolved, and high-priority counts. **AI Priority Queue** – The dashboard automatically sorts issues by High / Medium / Low priority, so officers instantly see the most critical cases.

#### 5.1.10 Duplicate Issue Detection
Before creating a new report, the system checks nearby existing issues within a 50-metre radius and same category. If a match is found, the user is shown: "A similar issue already exists near you" and is prompted to Support Existing Issue instead of creating a duplicate.

### 5.2 PHASE 2 – Build if Time Allows (Smart Enhancements)

#### 5.2.1 Advanced Duplicate & Similarity Detection
Enhances the MVP duplicate check with AI-powered image similarity and cross-category matching.

#### 5.2.2 AI Priority Scoring
The system generates a priority score based on: severity, population affected, location importance, community support count.

#### 5.2.3 Civic Alerts & Local Updates
Turns the app into a living neighbourhood news feed (e.g., "Water outage reported in your locality").

#### 5.2.4 Resolution Evidence
When an authority marks an issue Resolved, they must upload an "After" photo. Citizens can verify: Resolved or Still Not Resolved.

#### 5.2.5 User Impact Score (Civic Reputation)
Each user has a profile showing reports submitted, issues resolved, and community impact score.

#### 5.2.6 Hyperlocal Area Feed
A dedicated feed for the user's neighbourhood.

#### 5.2.7 Community Heatmap (Civic Health Visualization)
A live, color-coded map that visualises the civic health of every neighbourhood (Red/Yellow/Green zones).

### 5.3 PHASE 3 – Future Roadmap

- **AI Trust Engine:** Multi-layer verification.
- **Smart Authority Routing:** Auto-assign issue types to correct departments.
- **Predictive Civic Analytics:** Use historical patterns to predict future hotspots.
- **Verified Community Contributors:** Badge system.
- **Local Governance Hub:** Expand directory.
- **NGO & RWA Partnerships:** Collaborative resolution.
- **Government Integrations:** Connect with official APIs.
- **Reward Ecosystem:** Points, discounts, credits.

---

## 6. How CHARCHA Solves the 10 Core Problems

| Problem | CHARCHA Solution |
|---------|------------------|
| Duplicate Reports | AI duplicate detection + "Support Existing Issue" flow. |
| Fake Reports | AI image verification, community confirmation. |
| Spam Reporting | Trust score system. |
| Political Misuse | Anonymous mode; area-based aggregation. |
| Authorities Ignoring | Public lifecycle transparency. |
| User Retention | Hyperlocal Civic Alerts & Updates. |
| Wrong Department | AI auto-routing. |
| No Prioritisation | AI priority scoring. |
| Privacy & Safety | Anonymous reporting. |
| Authority Adoption | Simple dashboard for existing workflows. |

---

## 7. Demo Walkthrough

```
[ CITIZEN ]
    |
    v
(1) Notices pothole, Opens CHARCHA, Uploads photo
    |
    v
(2) AI detects pothole, generates details & System checks for duplicates
    |
    v
(3) If none, issue is created
    |
    v
(4) Community Confirms and Supports
    |
    v
(5) AI calculates priority; Authority Dashboard shows the issue
    |
    v
(6) Authority changes status to Resolved, uploads After photo
    |
    v
(7) Community receives alert -> Citizens verify
    |
    v
(8) Impact Score increases -> Heatmap updates
```

---

## 8. Why CHARCHA Stands Out

- Not just a complaint box – A complete ecosystem.
- AI that works from the first touch.
- Trust-first design.
- Retention baked in.
- Authority-friendly dashboard.
- Social impact visible via user profiles.
- Community Heatmap visualization.
- Scalable vision.

---

## 9. Technical Approach

| Layer | Technology |
|-------|-----------|
| Frontend | Flutter PWA |
| Backend | Node.js (Express) |
| AI Layer | Google Gemini API |
| Database | MongoDB (Atlas) |
| Anonymous Reporting | Hashed user ID for accountability |

---

## 10. Project Structure

This is a **monorepo** containing both the frontend and backend of CHARCHA.

```
charcha/
├── frontend/                 # Flutter PWA (Citizen + Authority UI)
│   ├── lib/                   # Dart source code
│   ├── web/                   # Web-specific assets (PWA manifest, service worker)
│   ├── android/               # Android platform config
│   ├── ios/                   # iOS platform config
│   ├── test/                  # Widget & unit tests
│   ├── public/                # Static web assets
│   ├── firebase.json          # Firebase Hosting config
│   ├── pubspec.yaml           # Flutter dependencies
│   └── README.md              # Frontend-specific docs
│
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # DB & app configuration
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, error handling, validation
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic (Gemini AI, etc.)
│   │   ├── utils/            # Helpers & utilities
│   │   └── app.js            # Express app entry
│   ├── Dockerfile            # Container definition for Cloud Run
│   ├── .dockerignore
│   ├── package.json          # Node dependencies & scripts
│   ├── .env.example          # Environment variable template
│   └── README.md             # Backend-specific docs
│
├── docs/                     # Project documentation
│   ├── DEPLOYMENT.md         # GCP deployment guide
│   └── API.md                # API documentation (to be added)
│
├── .gitignore                # Git ignore rules
├── README.md                 # This file
└── LICENSE                   # Project license
```

---

## 11. Getting Started

### Prerequisites

- **Node.js** v18+ (v22 recommended) — [Download](https://nodejs.org/)
- **npm** v9+ (ships with Node.js)
- **Flutter** v3.x stable — [Install](https://docs.flutter.dev/get-started/install)
- **Dart** v3.x (ships with Flutter)
- **MongoDB Atlas** account (free tier) — [Sign up](https://www.mongodb.com/cloud/atlas/register)
- **Google AI Studio** account for Gemini API key — [Get key](https://aistudio.google.com/)
- **Google Cloud** account (free tier) — [Sign up](https://cloud.google.com/)

### Clone & Setup

```bash
# Clone the repository
git clone <your-repo-url> charcha
cd charcha

# --- Backend Setup ---
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key
npm run dev   # Starts backend at http://localhost:5000

# --- Frontend Setup (new terminal) ---
cd ../frontend
flutter pub get
flutter run -d chrome   # Runs Flutter web at http://localhost:8080
```

---

## 12. Deployment Plan (GCP)

All services run on **free tier** — no paid resources required.

| Component | Where to Deploy | Service Name | Free Tier? |
|-----------|-----------------|--------------|-----------|
| Frontend (Flutter Web) | Firebase Hosting (part of GCP) | Firebase Hosting | ✅ 10 GB storage, 360 MB/day transfer |
| Backend (Node.js) | Cloud Run (serverless container) | Cloud Run | ✅ 2 million requests/month, 360k GB-seconds |
| Database (MongoDB) | MongoDB Atlas (external, allowed) | MongoDB Atlas | ✅ 512 MB storage free |
| AI (Gemini) | Google AI Studio API key, called from backend | Gemini API | ✅ Free tier (rate limits apply) |

### Step-by-Step Deployment

#### 1. GCP Account & Project
1. Go to [Google Cloud Console](https://cloud.google.com/), create a free tier account.
2. Create a new project (e.g., `charcha-app`).

#### 2. Firebase Hosting (Frontend)
1. Go to [Firebase Console](https://firebase.google.com/), select the same GCP project.
2. Enable Firebase Hosting.
3. Install Firebase CLI: `npm install -g firebase-tools`.
4. Run `firebase login`, then `firebase init hosting` and select the project.
5. Build Flutter web: `flutter build web` (output in `build/web`).
6. Deploy: `firebase deploy --only hosting`.
7. You'll get a URL like `https://charcha-app.web.app` → this is your submission link (frontend).

#### 3. Cloud Run (Backend)
1. Dockerize the backend (a `Dockerfile` is provided in `backend/`).
2. Deploy using Cloud Build or direct command:
   ```bash
   gcloud run deploy backend --source . --region=us-central1 --allow-unauthenticated
   ```
3. Cloud Run gives a URL like `https://backend-xxxxx-uc.a.run.app`.
4. Use this URL as an environment variable in the Flutter frontend for API calls.

#### 4. MongoDB Atlas (Database)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (shared tier).
2. Prefer region `asia-south1` for low latency.
3. Get the connection string, set user/password.
4. Add `MONGODB_URI` to backend environment variables (Cloud Run env vars or secrets).

#### 5. Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/), click "Get API Key".
2. Add `GEMINI_API_KEY` to backend environment variables.

### Submission Links
- **Deployed Application Link:** Firebase Hosting frontend URL (`https://charcha-app.web.app`)
- **GitHub Repository:** Backend + frontend code (monorepo), public repo.
- **Project Description (Google Doc):** Features, tech stack, deployment details, credits.

### Important Notes
- Firebase Hosting and Cloud Run are both on GCP — requirement satisfied.
- MongoDB Atlas is external but allowed — mention clearly in project doc.
- Free tier limits: 2 Cloud Run services free per month; Firebase hosting stays within free limits. Sufficient for a hackathon.
- Firebase Hosting link is public by default.

> See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full deployment guide.

---

## 13. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/charcha` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `GEMINI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `JWT_SECRET` | Secret for signing JWT tokens | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |
| `CLIENT_URL` | Frontend URL (CORS) | `http://localhost:8080` |
| `DUPLICATE_RADIUS_METERS` | Radius for duplicate detection | `50` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## 14. Roadmap

- ✅ **Phase 1** — Core MVP (Authentication, AI Reporting, Feed, Tracking, Dashboard, Duplicate Detection)
- 🚧 **Phase 2** — Smart Enhancements (Priority Scoring, Alerts, Resolution Evidence, Heatmap)
- 🔮 **Phase 3** — Future Vision (AI Trust Engine, Predictive Analytics, Government Integrations, Rewards)

---

## 15. Conclusion

> *"How do we create a trusted civic intelligence network between citizens and authorities?"*

Citizens provide data → AI verifies it → Community validates → Authorities act → System provides proof.

**Mohalle Se Mantralay Tak.** 🇮🇳

---

## License

This project is licensed for hackathon submission purposes. See the [LICENSE](LICENSE) file for details.
