# Estate Grove — Property Listing API + Dashboard

A full-stack property listing platform: agents publish and manage listings (with photo uploads), home seekers search/filter properties and submit enquiries, and agents track those enquiries from a dashboard.

Built for the "Property Listing API + Dashboard" assignment.

## Tech stack

| Layer     | Tech |
|-----------|------|
| Backend   | Node.js, Express, JWT (`jsonwebtoken`), `bcryptjs` for password hashing |
| Database  | **PostgreSQL** (raw SQL via the `pg` driver — no ORM lock-in) |
| Images    | **Cloudinary** (uploaded via `multer` in-memory storage + `cloudinary` upload streams) |
| Frontend  | React 19 + TypeScript (Vite), React Router, Axios |
| Auth      | JWT, stored in `localStorage`, sent as `Authorization: Bearer <token>` |

## Features

**Backend**
- User registration & login (`agent` or `seeker` role) with JWT auth
- Agents can create, edit, and delete **only their own** listings
- Public endpoint to browse all listings with **search by location**, **filter by BHK / type / price**, and pagination — all pushed down into SQL (`ILIKE`, indexed columns) rather than filtered in app code
- Home seekers (or anonymous visitors) can submit an enquiry for a property
- **Image uploads to Cloudinary** — agents upload up to 6 photos per listing; images are stored as Cloudinary URLs + public IDs in a `jsonb` column
- **Bonus:** Agent dashboard endpoints — view all enquiries across all of an agent's listings, and update enquiry status (`new` → `contacted` → `closed`)
- **Bonus:** Property view-count tracking

**Frontend**
- Login / registration pages with role selection
- Property listing page with search bar, BHK/type/price filters, and pagination
- Property detail page with an image gallery and an enquiry submission form
- Add / edit property form for agents, including drag-in photo upload with previews and per-image removal
- **Bonus:** Agent dashboard — manage listings and enquiries (with status updates) in one place

## Project structure

```
property-listing-app/
├── backend/                 # Express API
│   ├── config/cloudinary.js  # Cloudinary SDK config
│   ├── db/
│   │   ├── pool.js           # pg connection pool
│   │   ├── setup.sql        # table definitions
│   │   └── init.js        # applies init.sql
│   ├── routes/                # auth, properties, enquiries, uploads
│   ├── middleware/            # JWT auth + role guard, multer upload
│   ├── seed.js                 # demo data script
│   └── server.js
├── frontend/                # React + TypeScript (Vite)
│   └── src/
│       ├── pages/       # Login, Register, Listings, PropertyDetail, AddEditProperty, Dashboard
│       ├── components/  # Navbar, PropertyCard, ProtectedRoute
│       ├── context/     # AuthContext (JWT session)
│       └── api/         # axios instance
└── postman_collection.json
```

## Getting started

### Prerequisites
- Node.js 18+ and npm
- A PostgreSQL database (local install, or a free hosted instance — Neon, Supabase all work)
- A free [Cloudinary](https://cloudinary.com) account (for image uploads)

### 1. Set up PostgreSQL

**Option A — local Postgres:**
```bash
# create a database (adjust for your OS/installation)
createdb property_listing
```

**Option B — hosted Postgres (Neon/Supabase):**
Create a database there and copy its connection string — you'll paste it into `DATABASE_URL` below.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
- Set `DATABASE_URL` (or the individual `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` vars) to point at your Postgres instance. Set `PGSSL=true` if your host requires SSL (most hosted providers do).
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from your Cloudinary dashboard (Settings → API Keys).
- Set a real `JWT_SECRET`.

Then:
```bash
npm install
npm run db:init    # creates tables (users, properties, enquiries)
npm run seed        # optional: demo agent/seeker + 3 sample listings
npm run dev          # starts on http://localhost:5000 (nodemon)
# or: npm start
```

Demo accounts created by `npm run seed`:
| Role   | Email               | Password    |
|--------|---------------------|-------------|
| Agent  | agent@test.com   | Test@1234 |
| Seeker | seeker@test.com  | Test@1234 |

Health check: `GET http://localhost:5000/api/health`

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_URL defaults to http://localhost:5000/api
npm install
npm run dev                 # starts on http://localhost:5173
```

Open `http://localhost:5173`. Register a new account (choose "Agent" to list properties, or "Home seeker" to browse and enquire), or log in with the seeded demo accounts above.

### 4. Build for production

```bash
cd frontend
npm run build     # outputs static files to frontend/dist
```
Serve `frontend/dist` with any static host, and point `VITE_API_URL` at your deployed backend.

## API overview

Base URL: `http://localhost:5000/api`

| Method | Endpoint                         | Auth           | Description |
|--------|-----------------------------------|----------------|--------------|
| POST   | `/auth/register`                  | Public         | Register as `agent` or `seeker` |
| POST   | `/auth/login`                     | Public         | Log in, returns JWT |
| GET    | `/auth/me`                        | JWT            | Get current user |
| GET    | `/properties`                     | Public         | List/search/filter (`location`, `bhk`, `type`, `minPrice`, `maxPrice`, `page`, `limit`) |
| GET    | `/properties/:id`                 | Public         | Single property (increments view count) |
| GET    | `/properties/mine`                | JWT (agent)    | Current agent's own listings |
| POST   | `/properties`                     | JWT (agent)    | Create a listing (accepts `images: [{url, publicId}]`) |
| PUT    | `/properties/:id`                 | JWT (agent, owner) | Update own listing |
| DELETE | `/properties/:id`                 | JWT (agent, owner) | Delete own listing |
| POST   | `/uploads/images`                 | JWT (agent)    | Upload up to 6 images (`multipart/form-data`, field `images`) to Cloudinary; returns `[{url, publicId}]` |
| DELETE | `/uploads/images?publicId=...`    | JWT (agent)    | Remove an image from Cloudinary |
| POST   | `/enquiries`                      | Public         | Submit an enquiry for a property |
| GET    | `/enquiries/mine`                 | JWT (agent)    | All enquiries across the agent's listings (dashboard) |
| GET    | `/enquiries/property/:propertyId` | JWT (agent, owner) | Enquiries for one listing |
| PATCH  | `/enquiries/:id/status`           | JWT (agent, owner) | Update enquiry status |

Full request/response examples are in the Postman collection below.

## Postman collection

Import [`postman_collection.json`](./postman_collection.json) into Postman. It includes:
- A `baseUrl` collection variable (defaults to `http://localhost:5000/api`)
- Requests for every endpoint above, grouped into **Auth**, **Properties**, **Uploads**, and **Enquiries** folders
- Test scripts that automatically capture the JWT token and created `propertyId`/`enquiryId` into collection variables, so you can run requests in order without manually copying values
- For the image upload request, attach files to the `images` form-data field in Postman before sending

## Database schema

Defined in [`backend/src/db/setup.sql`](./backend/src/db/setup.sql) and applied via `npm run db:init`:
- `users (id, name, email, password_hash, role, created_at)`
- `properties (id, agent_id → users, title, description, location, bhk, price, type, area, images jsonb, views, created_at, updated_at)`
- `enquiries (id, property_id → properties, agent_id → users, name, email, phone, message, status, created_at)`

Foreign keys use `ON DELETE CASCADE`, so deleting a property automatically removes its enquiries, and deleting a user removes their listings.

## Notes / assumptions

- Prices are stored in INR (₹); `type: "rent"` is treated as a monthly amount.
- Enquiries can be submitted without an account (matches "home seekers can submit an enquiry" — no login wall), but the form works equally well for logged-in seekers.
- Images are uploaded directly from the browser to the backend, which streams them to Cloudinary (the API secret never reaches the client). Up to 6 images per listing, 5MB each.
- JWTs are stored in `localStorage` on the frontend for simplicity; for production, consider httpOnly cookies.

## Deployment (optional)

- **Backend**: deploy `backend/` to Render/Railway/Fly.io. Set `DATABASE_URL` (point it at a managed Postgres instance — Neon/Supabase all offer one), `PGSSL=true`, `JWT_SECRET`, and the three `CLOUDINARY_*` vars. Run `npm run db:init` once after first deploy.
- **Frontend**: deploy `frontend/` (after `npm run build`) to Vercel/Netlify. Set `VITE_API_URL` to your deployed backend URL.

---
Built by [Maniram](https://github.com/R4m21) · [LinkedIn](https://www.linkedin.com/in/maniram-chauhan)
