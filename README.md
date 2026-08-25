# scheme.gov — AI Assist for Gov

Multilingual Welfare Scheme Discovery Platform. Public users can search schemes by income/category/state, view required documents (EN/HI), and apply — all data persisted in MongoDB.

## Localhost

| Page | URL |
|------|-----|
| Home | http://localhost:3000 |
| Login | http://localhost:3000/login |
| Register | http://localhost:3000/register |
| Apply (PM-KISAN) | http://localhost:3000/apply/pm-kisan |
| Apply (Ayushman) | http://localhost:3000/apply/ayushman |
| Apply (MGNREGA) | http://localhost:3000/apply/mgnrega |
| Applications | http://localhost:3000/applications |
| Grievance | http://localhost:3000/grievance |

## Features

- **Scheme Discovery** — Filter by income, category (`farmer`/`health`/`employment`), state. Score + matching factors. Data from MongoDB `schemes` (seeded from `app/data/schemes.json`).
- **Apply with Documents** — Each scheme shows benefits, eligibility, and **Required Documents** in English & Hindi with checklist. Submit → `applications` collection.
- **Public Auth** — Register & Login for customer service. Passwords hashed with `bcryptjs` → `users` collection.
- **Grievance & Applications** — Track grievances and view all applications. DB status badge on Home (`GET /api/status`).

## Tech Stack

Next.js 16 (Turbopack) • React 19 • Tailwind CSS 4 • MongoDB + Mongoose • bcryptjs • react-hook-form + zod

## Quick Start

```bash
git clone https://github.com/itsmekiller299/scheme.gov.git
cd scheme.gov  # or hackathon-ai-welfare

npm install

# MongoDB (local)
mongod --dbpath /tmp/mongodb-data --logpath /tmp/mongodb-log/mongod.log --fork --bind_ip 127.0.0.1

# Env
cp .env.example .env.local
# MONGODB_URI=mongodb://127.0.0.1:27017/hackathon-ai-welfare

npm run dev
# open http://localhost:3000
```

Seed (auto on first search, or manual):

```bash
curl -X POST http://localhost:3000/api/seed
```

## Env

```
MONGODB_URI=mongodb://127.0.0.1:27017/hackathon-ai-welfare
# Atlas: mongodb+srv://user:pass@cluster.mongodb.net/hackathon-ai-welfare
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create public account |
| POST | `/api/auth/login` | Login |
| POST | `/api/search` | Search schemes `{language,income,category,state}` |
| GET | `/api/schemes?id=pm-kisan` | Get single scheme |
| GET | `/api/schemes` | List all schemes |
| POST | `/api/applications` | Apply for scheme |
| GET | `/api/applications?email=` | List applications |
| POST | `/api/grievances` | Submit grievance |
| GET | `/api/grievances?id=` | Get grievance |
| GET | `/api/status` | DB health `users/schemes/grievances` |

## Project Structure

```
app/
  page.tsx              # Home + search
  login/page.tsx        # Login
  register/page.tsx     # Public register
  apply/[id]/page.tsx   # Apply with docs checklist
  applications/page.tsx # My applications
  grievance/page.tsx    # Grievance
  api/                  # Auth, search, schemes, applications, grievances, status, seed
  lib/mongodb.ts        # Mongoose connection
  models/               # User, Scheme, Grievance, Application
  components/Navbar.tsx # Home/Applications/Grievance + auth
```

---

Favicon: Government emblem (tricolor + Ashoka Chakra) • Title: *AI Assist for Gov - Welfare Scheme Discovery*
