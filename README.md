# CampusFix 🎓

> A campus maintenance complaint management system built for students, department heads, and administrators.

---

## 📁 Repository Structure

```
campusfix/
├── CE-1/           ← CE-1 submission (original frontend with json-server)
│   ├── css/
│   ├── html/
│   ├── js/
│   ├── database/
│   ├── index.html
│   └── index.css
│
└── CE-2/           ← CE-2 submission (full-stack with Node.js + MongoDB)
    ├── frontend/   ← HTML/CSS/JS frontend (updated to call Express API)
    │   ├── css/
    │   ├── html/
    │   ├── js/
    │   ├── index.html
    │   └── index.css
    │
    └── backend/    ← Express.js + MongoDB MVC backend
        ├── config/
        ├── controllers/
        ├── middleware/
        ├── models/
        ├── routes/
        ├── server.js
        ├── seeder.js
        └── package.json
```

---

## 🚀 CE-2 Backend Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Installation

```bash
cd CE-2/backend
npm install
```

### Configuration

Create a `.env` file in `CE-2/backend/` (or update the existing one):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/campusfix
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

### Seed the database

```bash
npm run seed
```

### Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be running at `http://localhost:5000`

---

## 📡 API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | Login | Public |
| POST | `/api/auth/register` | Student registration | Public |
| POST | `/api/auth/logout` | Logout | Protected |
| GET | `/api/auth/me` | Get current user | Protected |
| GET | `/api/users` | List all users | Admin/DeptHead |
| POST | `/api/users` | Create user | Admin/DeptHead |
| PATCH | `/api/users/:id` | Update user | Admin/DeptHead |
| DELETE | `/api/users/:id` | Delete user | Admin/DeptHead |
| GET | `/api/departments` | List departments | Protected |
| POST | `/api/departments` | Add department | Admin |
| GET | `/api/locations` | List locations | Protected |
| POST | `/api/locations` | Add location | Admin |
| GET | `/api/complaints` | List complaints | Protected |
| POST | `/api/complaints` | File complaint | Protected |
| PATCH | `/api/complaints/:id` | Update complaint | Protected |
| DELETE | `/api/complaints/:id` | Delete complaint | Admin |

---

## 👤 Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@campusfix.com | admin@123 |
| Dept Head (Electrical) | ramesh@gmail.com | password123 |
| Dept Head (Plumbing) | suresh@gmail.com | password123 |
| Student | satyam@gmail.com | Satyam@123 |
| Employee | vikram@campusfix.com | Employee@123 |

---

## 🏗️ MVC Architecture (CE-2 Backend)

```
backend/
├── config/
│   └── db.js              ← MongoDB connection
├── models/
│   ├── User.js            ← User schema (all roles)
│   ├── Department.js      ← Department schema
│   ├── Location.js        ← Location schema
│   └── Complaint.js       ← Complaint schema
├── controllers/
│   ├── authController.js      ← Login / Register / Logout
│   ├── userController.js      ← CRUD for users
│   ├── departmentController.js← CRUD for departments
│   ├── locationController.js  ← CRUD for locations
│   └── complaintController.js ← CRUD for complaints
├── middleware/
│   └── authMiddleware.js  ← JWT protection + role authorization
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── departmentRoutes.js
│   ├── locationRoutes.js
│   └── complaintRoutes.js
├── server.js              ← Express app entry point
├── seeder.js              ← Database seeder
└── .env                   ← Environment variables
```
