# CampusFix — CE-2

> Campus Issue Management System — Node.js + Express backend, vanilla HTML/CSS/JS frontend.

Built at the Department of Computer Science, Chitkara University.  
Author: **Satyam Chhabra**

---

## What's inside

```
CE-2/
├── backend/          ← Express + MongoDB/JSON DB
│   ├── controllers/  ← Business logic (auth, complaints, users, attendance, leaves, payslips)
│   ├── models/       ← Mongoose schemas (User, Complaint, Department, Location, Attendance, Leave, Payslip)
│   ├── routes/       ← API routes
│   ├── middleware/   ← JWT auth
│   ├── config/       ← DB connection + JSON DB fallback
│   ├── data/db.json  ← Local JSON database (used when USE_JSON_DB=true)
│   └── server.js     ← Entry point
└── frontend/
    ├── index.html        ← Landing / homepage
    ├── css/              ← style.css, dashboard.css, auth.css
    ├── html/             ← login, student, dept_head, admin, employee dashboards
    └── js/               ← auth, dashboard, student, dept_head, dept_head_extra, employee, validation
```

---

## Portals & Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@campusfix.com | admin@123 |
| Dept Head (Electrical) | ramesh@gmail.com | password123 |
| Dept Head (Plumbing) | suresh@gmail.com | password123 |
| Student | satyam@gmail.com | Satyam@123 |
| Employee (Electrical) | vikram@campusfix.com | Employee@123 |
| Employee (Plumbing) | krishna@gmail.com | Krishna@123 |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Satyam2006chh/CampusFix.git
cd CampusFix/CE-2
```

### 2. Set up backend

```bash
cd backend
npm install
```

### 3. Create your `.env` file

```bash
cp .env.example .env
```

The default `.env.example` is already configured to run with the **local JSON database** — no MongoDB needed.

### 4. Start the backend server

```bash
npm run dev      # development (auto-restart on save)
# or
npm start        # production
```

Server starts at → `http://localhost:5000`

### 5. Open the frontend

No build step needed — just open the file directly in your browser:

```
CE-2/frontend/index.html          ← Homepage
CE-2/frontend/html/login.html     ← Login page
```

Or serve it with any static server:

```bash
# using VS Code Live Server extension — just right-click index.html → Open with Live Server
# or using npx:
npx serve CE-2/frontend
```

---

## Running with MongoDB (optional)

If you want to use MongoDB instead of the JSON file:

1. Install [MongoDB](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
2. In `.env`, comment out `USE_JSON_DB=true` and set your URI:
   ```
   # USE_JSON_DB=true
   MONGO_URI=mongodb://localhost:27017/campusfix
   ```
3. Seed the database:
   ```bash
   npm run seed
   ```

---

## Features

- **Student portal** — report issues, track status, upvote duplicates, confirm fixes
- **Employee portal** — view assigned tasks, GPS-verified clock in/out, leave requests, payslips
- **Dept Head portal** — assign complaints, manage employees, view attendance, approve leaves, generate payslips
- **Admin portal** — full campus analytics, manage departments, locations, all users

### Clock-in / Clock-out
- Employees must be within **500m of Chitkara University, Rajpura** to clock in or out
- Time categories: On Time (before 9:00), Slightly Late (9:00–9:30), Late (after 9:30)
- Background location checks every 30 min detect early departures during shift

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) + JSON file fallback |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Frontend | HTML5, CSS3, Vanilla JS |
| Font | Outfit (Google Fonts) |

---

## API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/complaints
POST   /api/complaints
PATCH  /api/complaints/:id
DELETE /api/complaints/:id

GET    /api/departments
POST   /api/departments

GET    /api/locations
POST   /api/locations

GET    /api/attendance
POST   /api/attendance
PATCH  /api/attendance/:id

GET    /api/leaves
POST   /api/leaves
PATCH  /api/leaves/:id

GET    /api/payslips
POST   /api/payslips
```

---

## Project Structure Notes

- All data is stored in `backend/data/db.json` when running in JSON mode — this file is committed so **you get all the sample data immediately after cloning**.
- The `node_modules/` folder is gitignored — run `npm install` once after cloning.
- The `.env` file is gitignored — copy `.env.example` to `.env` once after cloning.
