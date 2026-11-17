# Kooberit

Kooberit is a marketplace that connects **homeowners** with **contractors** for construction jobs (roofing, siding, brickwork, and similar). Homeowners post jobs, contractors bid on them, and the two sides chat, award work, and handle payments in the app.

This repository contains both halves of the product:

| Folder | Stack | Purpose |
| --- | --- | --- |
| [backend/](backend/) | Node.js, Express 5, TypeScript, MongoDB (Mongoose), Socket.IO, Agenda | REST API, real-time chat, scheduled jobs |
| [frontend/](frontend/) | Expo 54, React Native 0.81, Expo Router, Redux Toolkit | Mobile app (Android / iOS / web) |

## Features

- Email sign-up with OTP verification, sign-in, and password reset (JWT auth)
- Roles: `homeowner`, `contractor`, `admin`
- Job posting with categories, location-based discovery, and file attachments
- Contractor bids, bid awarding, and project milestones, plus extension and completion prompts
- Real-time chat over Socket.IO
- Stripe payments (job payments and award fees)
- Invitations, contacts, and profile settings
- Transactional email through SendGrid
- Background jobs with Agenda (job notifications every minute; extension and completion prompts daily)

## Prerequisites

- Node.js 20+
- MongoDB (local or hosted)
- A Stripe account (test keys are fine for development)
- A SendGrid API key, for outgoing email
- Expo tooling for the app: the Expo Go app, an Android emulator, or the iOS simulator

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values
npm run dev            # starts on SERVER_PORT with hot reload
```

Environment variables (`backend/.env`):

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `SERVER_PORT` | Port to listen on. The app expects `5000` in development |
| `JWT_SECRET` | Secret for signing auth tokens |
| `ENCRYPTION_KEY` | Key used by `src/utils/encryption.ts` |
| `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_MAX_POOL_SIZE` | MongoDB connection |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | Email delivery |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Stripe keys |
| `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` | Admin account created automatically on first start |

On startup the server connects to MongoDB, starts Socket.IO and the Agenda scheduler, creates the default admin, and then listens. Check that it is running with `GET /api/health`.

Backend scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` and resolve path aliases |
| `npm start` | Run the compiled build |
| `npm test` | Run Jest tests |

### 2. Frontend (mobile app)

```bash
cd frontend
npm install
cp .env.exmaple .env   # note: the example file name is spelled "exmaple"
npx expo start
```

Environment variables (`frontend/.env`):

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST` | Stripe publishable key used in development builds |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE` | Stripe publishable key used in production builds |

The API URL is set in [frontend/constants/config.ts](frontend/constants/config.ts):

- iOS simulator / web: `http://localhost:5000/api`
- Android emulator: `http://10.0.2.2:5000/api`
- Physical device: replace this with your machine's LAN IP, e.g. `http://192.168.1.100:5000/api`
- Production: `https://server.kooberit.com/api`

Frontend scripts:

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `ios` / `web` | Start the dev server and open it on a target platform |
| `npm run lint` | Run ESLint |
| `npm run build` | Build an Android preview with EAS (`eas build -p android --profile preview`) |

## Project structure

```
backend/
  src/
    config/        # constants, enums, database and Agenda setup
    controllers/   # Express request handlers
    middlewares/   # auth (isAuthenticated) and Joi validation
    models/        # Mongoose models (User, Job, Bid, Chat, Message, PaymentLog, ...)
    routes/        # route modules mounted under /api
    services/      # business logic (auth, jobs, bids, chat, payments, email, notifications)
    socket/        # Socket.IO server
    validators/    # Joi schemas
    utils/         # logger, JWT, encryption, error helpers
    index.ts       # entry point
  .github/workflows/deploy.yml

frontend/
  app/             # Expo Router screens: (auth), (tabs), job/[id], chat/[id], payment/...
  components/      # shared UI components
  services/        # API clients and the socket client
  store/           # Redux Toolkit store and slices
  constants/       # config (API URL, Stripe key, categories) and theme
  hooks/, libs/, utils/, types/
```

## API overview

Every route is prefixed with `/api`. Routes marked 🔒 require a valid JWT.

| Path | Description |
| --- | --- |
| `/auth` | Sign up, sign in, OTP verification, password reset |
| `/users` 🔒 | User management |
| `/jobs` 🔒 | Create, list, and manage jobs |
| `/bids` 🔒 | Submit and manage bids |
| `/chats` 🔒 | Chats and messages |
| `/contacts` 🔒 | Contacts |
| `/profile` 🔒 | Profile and settings for contractors and homeowners |
| `/upload` 🔒 | File uploads, served from `/uploads` |
| `/payments` 🔒 | Stripe payments |
| `/invitations` | Invitations |
| `/health` | Health check |
