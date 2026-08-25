# scheme.gov — AI Assist for Gov

AI Assist for Gov — Multilingual Welfare Scheme Discovery Platform. Public users can register, discover schemes via income/category/state, and apply with required documents. Built for hackathon-ai-welfare.

**Live:** `http://localhost:3000` (Next.js 16 + MongoDB + Mongoose)

## Features
- **Schemes:** PM-KISAN, Ayushman Bharat PM-JAY, MGNREGA (stored in MongoDB `schemes`, seeded from `app/data/schemes.json`)
- **Apply Flow:** `Home → Apply Now → /apply/[id]` shows benefits (EN/HI), eligibility, **Required Documents checklist** (Aadhaar/Land records etc. with Hindi), form → `POST /api/applications` → `applications` collection
- **Auth:** `Login` (`/login`) + `Create account` (`/register`) for public customer service → MongoDB `users` (bcryptjs)
- **Grievance:** `/grievance` → `grievances` collection (black Submit button)
- **Applications:** `/applications` list from DB
- **DB Status:** Home badge `MongoDB: hackathon-ai-welfare ✓` via `GET /api/status`
- **Government favicon:** Tricolor + Ashoka Chakra (`app/favicon.ico` + `app/icon.png`)

## Getting Started

```bash
npm install
# start MongoDB (local)
mongod --dbpath /tmp/mongodb-data --logpath /tmp/mongodb-log/mongod.log --fork --bind_ip 127.0.0.1
# or use Atlas: set MONGODB_URI in .env.local

cp .env.example .env.local  # MONGODB_URI=mongodb://127.0.0.1:27017/hackathon-ai-welfare
npm run dev
# open http://localhost:3000
```

**Seed:** `curl -X POST http://localhost:3000/api/seed` or auto-seeds on first `/api/search`.

## API
- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/search` - filter by income/category/state
- `GET /api/schemes?id=pm-kisan`, `GET /api/schemes`
- `POST /api/applications` - apply for scheme with docs checklist
- `GET /api/applications?email=...`
- `POST /api/grievances`, `GET /api/grievances?id=...`
- `GET /api/status` - DB health

## Tech
Next.js 16.3.2 (Turbopack), React 19, Tailwind 4, Mongoose 8, bcryptjs, react-hook-form + zod.

## Deploy on Vercel
Set `MONGODB_URI` in Vercel env (Atlas). See [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying).
