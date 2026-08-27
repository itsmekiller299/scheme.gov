# scheme.gov — AI Assist for Gov

Multilingual Welfare Scheme Discovery Platform. Public users can search **94 central schemes** by income/category/state, view required documents (EN/HI), and apply — all data persisted in MongoDB (auto-synced from `app/data/schemes.json`).

## Localhost

| Page | URL |
|------|-----|
| Home | http://localhost:3000 |
| Login | http://localhost:3000/login |
| Register | http://localhost:3000/register |
| Apply (PM-KISAN) | http://localhost:3000/apply/pm-kisan |
| Apply (Ayushman) | http://localhost:3000/apply/ayushman |
| Apply (MGNREGA) | http://localhost:3000/apply/mgnrega |
| Apply (Handloom - NHDP) | http://localhost:3000/apply/nhdp |
| Apply (Weaver MUDRA) | http://localhost:3000/apply/weaver-mudra-hathkargha |
| Apply (Yarn Supply) | http://localhost:3000/apply/yss-yarn-supply |
| Applications | http://localhost:3000/applications |
| Grievance | http://localhost:3000/grievance |
| Customer Service (User) | http://localhost:3000/customer-service |
| Admin Panel | http://localhost:3000/admin |
| Admin - Users | http://localhost:3000/admin/users |
| Admin - Applications | http://localhost:3000/admin/applications |
| Admin - Grievances | http://localhost:3000/admin/grievances |
| Admin - Customer Service | http://localhost:3000/admin/customer-service |
| Admin - Schemes | http://localhost:3000/admin/schemes |
| API - All schemes | http://localhost:3000/api/schemes |
| API - DB health | http://localhost:3000/api/status |
| Pitch PPT (12 slides) | http://localhost:3000/scheme-gov-AI-Assist-for-Gov-Professor-Pitch.pptx |
| Pitch PPT (file) | `./scheme-gov-AI-Assist-for-Gov-Professor-Pitch.pptx` |

> Dev server already running at `http://localhost:3000` — DB shows `schemes:94` via `GET /api/status`. If stopped, run `npm run dev`.
>
> **Admin login:** `admin@welfare.gov.in / Admin1234` (admin), `staff@welfare.gov.in / Staff1234` (staff) — seeded via `POST /api/seed`. User: `demo@welfare.gov.in / demo123`.

## Features

- **Scheme Discovery (94 schemes, 14 categories)** — Filter by income, category, state. Score + matching factors. Data from MongoDB `schemes` (seeded/synced from `app/data/schemes.json` via `bulkWrite` upsert on every search/schemes/seed call).
  - `farmer` (10): PM-KISAN, PMFBY, KCC, Soil Health Card, PM-KUSUM, Per Drop More Crop, SMAM, PMMSY, AHIDF, Atal Bhujal
  - `health` (5): Ayushman PM-JAY, JSY, Mission Indradhanush, ABDM, AYUSH Mission
  - `employment` (16): MGNREGA, MUDRA, E-Shram, PMKVY 4.0, DDU-GKY, PMEGP, Startup India, Stand-Up India, PM Vishwakarma, PM SVANidhi, NAPS, Skill India Digital, DAY-NULM, PM Internship, PM MITRA (textile parks), etc.
  - `housing` (7): PMAY (G+U), PMAY-U 2.0, Swachh Bharat, Jal Jeevan Mission, SVAMITVA, AMRUT 2.0, Smart Cities
  - `finance` (3): Jan Dhan, Stand-Up India, CGTMSE
  - `women` (10): Ujjwala, Sukanya Samriddhi, PMMVY, Beti Bachao, POSHAN Abhiyaan, ICDS, NRLM, NAMO Drone Didi, Lakhpati Didi, Mission Shakti
  - `pension` (7): APY, PM-KMY, PM-SYM, IGNOAPS/WPS/DPS (NSAP), PM Vaya Vandana, etc.
  - `insurance` (2): PMSBY, PMJJBY
  - `food` (3): PMGKAY, NFSA, ONORC
  - `education` (18): PM POSHAN, Samagra Shiksha, NSP, YASASVI, SC/OBC/Minority/Post-Matric, Top Class SC, NMMSS, PMSS (defence), EMRS, ST Fellowship, Vidya Lakshmi, eVIDYA, BharatNet, PM-WANI, PMGDISHA, AIM
  - `energy` (3): PM Surya Ghar, UJALA, PM E-Drive
  - `disability` (2): ADIP, Niramaya
  - `tribal` (2): Van Dhan, Janjatiya Utkarsh (Dharti Aaba)
  - `handloom` (6): NHDP, Yarn Supply Scheme (YSS/RMSS), CHCDS Mega Cluster, Weaver MUDRA / Hathkargha Samvardhan Sahayata, Weavers Welfare Insurance (converged PMJJBY/PMSBY/Ayushman), Handloom Mark & India Handloom Brand
- **Apply with Documents** — Each scheme shows benefits, eligibility, and **Required Documents** in English & Hindi with checklist. Submit → `applications` collection. Works for all 94 including handloom (`/apply/[id]` dynamic).
- **Document Uploading System** — Per-document file input (PDF/JPG/PNG/WebP, max 5MB). `POST /api/upload` → saves to `public/uploads/` → returns `fileUrl`; linked in `applications.documents[].fileUrl` and viewable via `View` links.
- **Public Auth** — Register & Login for customer service. Passwords hashed with `bcryptjs` → `users` collection.
- **Grievance & Applications** — Track grievances and view all applications (with uploaded file links). DB status badge on Home (`GET /api/status` shows `users/schemes/grievances`).
- **Admin Panel** — `role: admin/staff` gated (`JWT + httpOnly cookie`) at `/admin` with dashboard stats (`/api/admin/stats`), user management (`/api/admin/users` PATCH role), applications moderation (`/api/admin/applications` PATCH status), grievances (`/api/admin/grievances`), schemes CRUD (`/api/admin/schemes`), and customer-service ticket queue (`/api/admin/tickets`). Sidebar + mobile nav, auth guard via `/api/auth/me`.
- **Customer Service** — User ticket system (`CustomerTicket` model) at `/customer-service`: create tickets (`category: general/scheme/handloom/technical` etc., `priority`, `schemeId`), view own tickets, threaded replies (user ↔ admin/staff). Admin view at `/admin/customer-service` with status/priority filter, reply, resolve/close. API `POST/GET /api/customer-service` (auth + rate-limit, XSS strip) and `PATCH` for admin actions.

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

Seed (auto on first search/schemes call via `bulkWrite` upsert, or manual):

```bash
curl -X POST http://localhost:3000/api/seed
# or GET http://localhost:3000/api/seed
# returns { success:true, schemes:94 }
```

Verify:
```bash
curl http://localhost:3000/api/status
# {"connected":true,"dbName":"hackathon-ai-welfare","collections":{"schemes":94,...}}

curl http://localhost:3000/api/schemes | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['schemes']))"
# 94
```

## Env

```
MONGODB_URI=mongodb://127.0.0.1:27017/hackathon-ai-welfare
# Atlas: mongodb+srv://user:pass@cluster.mongodb.net/hackathon-ai-welfare
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create public account (role=user, JWT cookie) |
| POST | `/api/auth/login` | Login (sets httpOnly JWT, rate-limit 10/15m) |
| GET | `/api/auth/me` | Current user from JWT cookie |
| POST | `/api/auth/logout` | Clear JWT cookie |
| POST | `/api/search` | Search schemes `{language,income,category,state}` — filters 94 schemes, rate-limit 30/min |
| GET | `/api/schemes?id=pm-kisan` | Get single scheme (e.g., `?id=nhdp` for handloom) |
| GET | `/api/schemes` | List all 94 schemes |
| POST | `/api/upload` | Upload document (`multipart`: `file` + `docName`) → `public/uploads` (auth required, mime/ext whitelist) |
| GET | `/api/upload` | List uploaded files (auth required) |
| POST | `/api/applications` | Apply for scheme (with `fileUrl` per doc, stores only `aadhaarLast4`) |
| GET | `/api/applications?email=` | List own applications (auth required, owner-only) |
| POST | `/api/grievances` | Submit grievance (XSS strip, aadhaarLast4 only) |
| GET | `/api/grievances?id=` | Get grievance (auth required) |
| POST | `/api/customer-service` | Create ticket or reply (`subject,description,category,priority,schemeId` or `ticketId+message`) |
| GET | `/api/customer-service?ticketId=` | Get own ticket(s) (admin can `?all=1`) |
| PATCH | `/api/customer-service` | Admin update ticket status/priority |
| GET | `/api/admin/stats` | Admin dashboard counts + breakdown |
| GET | `/api/admin/users` | List users (admin only) |
| PATCH | `/api/admin/users` | Change role (`userId,role`) |
| GET | `/api/admin/applications` | List all applications (admin) |
| PATCH | `/api/admin/applications` | Update status |
| GET | `/api/admin/grievances` | List all grievances |
| PATCH | `/api/admin/grievances` | Update status |
| GET | `/api/admin/tickets` | List all tickets |
| PATCH | `/api/admin/tickets` | Reply + status change |
| POST/PATCH/DELETE | `/api/admin/schemes` | CRUD schemes |
| GET | `/api/status` | DB health `users/schemes/grievances/tickets` |
| GET/POST | `/api/seed` | Sync DB to JSON (upsert 94 schemes, seeds admin/staff/demo) |

## Project Structure

```
app/
  page.tsx              # Home + search (94 schemes, 14 categories)
  login/page.tsx        # Login (httpOnly JWT)
  register/page.tsx     # Public register (8-char min)
  apply/[id]/page.tsx   # Apply with docs upload (file input → /api/upload) — dynamic for all 94 ids
  applications/page.tsx # My applications (with file View links, auth)
  grievance/page.tsx    # Grievance (auth GET)
  customer-service/page.tsx # User tickets: create/view/reply
  admin/
    layout.tsx          # Admin guard (role admin/staff via /api/auth/me) + sidebar
    page.tsx            # Dashboard (stats, breakdown, recent)
    users/page.tsx      # Users table + role change
    applications/page.tsx # All applications + status update
    grievances/page.tsx # All grievances + status update
    customer-service/page.tsx # Ticket queue + reply/close
    schemes/page.tsx    # Schemes list (94, filter by category)
  data/
    schemes.json        # 94 schemes source of truth (handloom:6)
    indianStates.ts     # 28 states
  api/
    auth/               # login, register, me, logout (JWT httpOnly)
    search/             # POST search (bulkWrite sync if count < 94, rate-limit)
    schemes/            # GET single/list (bulkWrite sync)
    upload/             # POST multipart → public/uploads (auth+mime whitelist)
    applications/       # POST with fileUrl (aadhaarLast4 only), GET owner-only
    grievances/         # POST/GET (XSS strip, auth)
    customer-service/   # POST create/reply, GET own/ticketId, PATCH admin
    admin/              # stats, users, applications, grievances, tickets, schemes (admin only)
    status/ seed/       # health, seed (bulkWrite upsert, seeds admin@welfare.gov.in/Admin1234)
  lib/
    mongodb.ts          # Mongoose connection (cache + 2s timeout)
    auth.ts             # JWT (HS256, 7d), verifyAuth, requireAdmin, rate-limit, getClientIp
  models/               # User (role), Scheme, Grievance, Application (aadhaarLast4), CustomerTicket
  components/
    Navbar.tsx          # Home/Applications/Grievance/Help/CustomerService + Admin (role-gated) + auth
    search/SearchForm.tsx # Category dropdown 14 options (94 schemes + handloom 6)
    result/Result.tsx   # Scheme results with score
  proxy.ts              # Security headers (CSP, HSTS, X-Frame etc.) + no-store for sensitive APIs
public/
  uploads/              # Uploaded docs (5MB max, PDF/JPG/PNG/WebP, auth required) + .gitkeep
  gov-emblem.png        # Favicon source
  favicon.ico           # Gov emblem
```

## Admin Panel

**Access:** `http://localhost:3000/admin` — requires `admin` or `staff` role (JWT httpOnly cookie). Guard in `app/admin/layout.tsx:1` checks `GET /api/auth/me` and redirects to `/login?next=/admin` if not admin.

**Seeded credentials (via `POST /api/seed`):**

| Role | Email | Password | Access |
|------|-------|----------|--------|
| admin | `admin@welfare.gov.in` | `Admin1234` | Full: users/roles, applications, grievances, schemes CRUD, tickets |
| staff | `staff@welfare.gov.in` | `Staff1234` | Tickets, applications, grievances (no user role change) |
| user | `demo@welfare.gov.in` | `demo123` | Public user (no admin) |

```bash
curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: local-dev-seed-secret"
# seeds 94 schemes + 3 users above
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@welfare.gov.in","password":"Admin1234"}' -c cookies.txt
curl -b cookies.txt http://localhost:3000/api/admin/stats | python3 -m json.tool
```

**Routes:** `/admin` (dashboard `app/admin/page.tsx:1`), `/admin/users` (`app/admin/users/page.tsx:1` PATCH role), `/admin/applications` (PATCH status), `/admin/grievances`, `/admin/customer-service` (reply + status), `/admin/schemes` (list + API CRUD). Navbar shows `Admin` badge only for `admin/staff` `app/components/Navbar.tsx:119`.

## Customer Service

User: `http://localhost:3000/customer-service` — `POST /api/customer-service` create (`subject,description,category: handloom|scheme|...,priority,schemeId`), `GET /api/customer-service?ticketId=CS-...`, threaded replies `messages[]`. Admin: `http://localhost:3000/admin/customer-service` + `GET /api/admin/tickets` + `PATCH` reply. Model `app/models/CustomerTicket.ts:1` (`ticketId, status: open|in_progress|waiting|resolved|closed`).

## Handloom Schemes Detail (Ministry of Textiles)

| ID | Scheme | Key Benefit |
|----|--------|-------------|
| `nhdp` | National Handloom Development Programme | Block clusters ₹2cr, CFC, 15% marketing, design via WSC |
| `yss-yarn-supply` | Yarn Supply Scheme (RMSS) | Mill Gate Price + 10% subsidy + freight via NHDC/e-Dhaga |
| `chcds-mega-cluster` | CHCDS Mega Cluster | Up to ₹40cr/mega cluster (Varanasi/Sivasagar), dyeing/warping/testing |
| `weaver-mudra-hathkargha` | Weaver MUDRA / HSS | ₹10L MUDRA at 6% subvention + 90% margin money + workshed ₹1.2L |
| `handloom-welfare-insurance` | Weavers Welfare (converged) | PMJJBY/PMSBY + Ayushman ₹5L + NSP scholarship for wards |
| `handloom-marketing-india-brand` | Handloom Mark & India Brand | Certification (Textiles Committee) + fairs/GeM/ONDC + GI |

---

## Presentation — Professor Pitch (12 Slides)

**File:** `scheme-gov-AI-Assist-for-Gov-Professor-Pitch.pptx:1` (55K, 13.33×7.5" widescreen) — also at `public/scheme-gov-AI-Assist-for-Gov-Professor-Pitch.pptx:1` → live `http://localhost:3000/scheme-gov-AI-Assist-for-Gov-Professor-Pitch.pptx`

| Slide | Title | Content |
|-------|-------|---------|
| 1 | Title | scheme.gov, 94 schemes, Live `http://localhost:3000`, `admin/Admin1234` |
| 2 | Problem & Vision | Gap vs one platform |
| 3 | 94 Schemes 14 Cats | Grid + scoring note |
| 4 | Handloom 6 | `nhdp/yss/chcds/weaver-mudra/welfare/mark` with `/apply/*` |
| 5 | Journey & Arch | 3 steps + `Frontend→API→MongoDB` |
| 6 | Features: Discovery & Apply | SearchForm 14 cats, upload |
| 7 | Admin + Customer Service | `/admin` + `/customer-service` threaded |
| 8 | Secure by Design | JWT, aadhaarLast4, rate-limit, CSP |
| 9 | Quick Start & API | 3 steps + 6 APIs |
| 10 | Route Map & Live Demo | 34 routes, 60-sec script |
| 11 | Impact & Future | State schemes + RAG AI |
| 12 | Thank You | Credentials |

Generated via `python-pptx` `tmp/make_ppt.py:1` — uses tricolor header bar + rounded cards. Open in PowerPoint/Keynote for tomorrow.

---

Favicon: Government emblem (tricolor + Ashoka Chakra) • Title: *AI Assist for Gov - Welfare Scheme Discovery*
