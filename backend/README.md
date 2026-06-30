# CHARCHA Backend

AI-powered civic intelligence platform backend — Node.js + Express + MongoDB.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ (ES Modules) |
| Framework | Express.js |
| Database | MongoDB (Atlas) via Mongoose |
| AI | Google Gemini API (`@google/generative-ai`) |
| Auth | JWT + bcryptjs |
| Security | Helmet, CORS, Rate Limiting, Mongo Sanitize, XSS, HPP |
| Logging | Winston + Morgan |

## Project Structure

```
backend/
├── src/
│   ├── config/           # App & DB configuration
│   │   ├── index.js      # Centralized env config
│   │   └── db.js         # MongoDB connection
│   ├── controllers/      # Request handlers (stubs)
│   │   ├── authController.js
│   │   ├── issueController.js
│   │   ├── departmentController.js
│   │   └── userController.js
│   ├── middleware/       # Express middleware
│   │   ├── authMiddleware.js   # JWT protect & authorize
│   │   └── errorMiddleware.js  # 404 & global error handler
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   ├── Issue.js
│   │   └── Department.js
│   ├── routes/           # API routes (stubs)
│   │   ├── authRoutes.js
│   │   ├── issueRoutes.js
│   │   ├── departmentRoutes.js
│   │   └── userRoutes.js
│   ├── services/         # Business logic
│   │   └── geminiService.js    # Gemini AI integration (stub)
│   ├── utils/            # Helpers
│   │   ├── logger.js     # Winston logger
│   │   ├── ApiError.js   # Custom error class
│   │   └── apiResponse.js # Response helpers
│   ├── app.js           # Express app setup
│   └── server.js        # Entry point
├── Dockerfile           # Cloud Run container
├── .dockerignore
├── .env.example         # Environment template
└── package.json
```

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key
npm run dev
```

Server runs at `http://localhost:5000`.

## Available Endpoints (Skeleton)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/health` | Health check | ✅ Active |
| GET | `/api` | API info | ✅ Active |
| POST | `/api/auth/register` | Register user | 🔜 Stub |
| POST | `/api/auth/login` | Login user | 🔜 Stub |
| GET | `/api/auth/me` | Current user | 🔜 Stub |
| GET | `/api/issues` | Community feed | 🔜 Stub |
| POST | `/api/issues` | Create issue (AI) | 🔜 Stub |
| GET | `/api/issues/:id` | Single issue | 🔜 Stub |
| PUT | `/api/issues/:id` | Update status | 🔜 Stub |
| POST | `/api/issues/:id/confirm` | Confirm issue | 🔜 Stub |
| POST | `/api/issues/:id/support` | Support issue | 🔜 Stub |
| GET | `/api/issues/duplicate-check` | Duplicate check | 🔜 Stub |
| GET | `/api/departments` | Authority directory | 🔜 Stub |
| GET | `/api/users/profile` | User profile | 🔜 Stub |

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

## Deployment

Deployed to **Google Cloud Run** (free tier). See the root [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for full instructions.
