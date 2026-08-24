<div align="center">

![CampusFix](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/1.png)

# CampusFix
### Fix Your Campus. Fast. Smart. Tracked.

🟢 **Live Demo:** [https://campusfix-szz4.onrender.com/](https://campusfix-szz4.onrender.com/)

**A centralized college infrastructure complaint management system built with pure HTML, CSS, and JavaScript.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JSON Server](https://img.shields.io/badge/JSON_Server-000000?style=for-the-badge&logo=json&logoColor=white)

</div>

---

## What is CampusFix?

CampusFix is a full-stack web application (frontend-only stack) designed to eliminate the chaos of verbal complaints and unaccountable departments in college campuses. Students can report infrastructure problems, department heads can manage and assign them to staff, and the super admin has a complete view of everything happening across the entire campus.

Built entirely with **HTML, CSS, and Vanilla JavaScript**. No frameworks. No shortcuts. Data is managed via **JSON Server** acting as a lightweight REST API backend.

---

## The Problem We Solve

| Before CampusFix | After CampusFix |
|---|---|
| Verbal complaints get forgotten | Every complaint is digitally logged with a unique ID |
| No tracking — students don't know what happened | Real-time status tracking (Pending to In Progress to Resolved) |
| Students don't know who to approach | Automatic routing to the correct department by category |
| 10 students report the same broken cooler separately | Smart duplicate detection with upvoting system |
| Departments fake-close complaints | Student must confirm the fix — departments cannot cheat |
| Zero accountability or deadlines | Deadline tracking with overdue alerts for department heads |
| No data for authorities | Analytics dashboard — complaints by department, block, and time |

---

## Three Role-Based Portals

### Super Admin
Full control of the campus system. Can add departments, assign department heads, manage all campus locations, view all complaints across every department, and activate or deactivate any user account.

### Department Head
Receives complaints routed to their department automatically. Can assign complaints to employees with a deadline, mark them as resolved, and manage their department's staff members.

### Student
Can register, log in, and report issues with category, location, urgency, and an optional photo. Tracks all submitted complaints in real time. Can upvote existing duplicate issues instead of filing duplicates. Confirms or rejects resolution when a fix is submitted by the department.

---

## Key Features

- Role-based Authentication — 3 separate portals with secure session management
- Smart Complaint Routing — Complaints automatically routed to the correct department by category
- Duplicate Detection — Same issue at same location? System detects it and lets students upvote instead
- Student Resolution Confirmation — Students must confirm a fix. Departments cannot fake-close a complaint
- Deadline and Overdue Tracking — Heads assign deadlines; overdue complaints are flagged in red
- Analytics Dashboard — Complaints by department, hotspot blocks, and global statistics
- Dark and Light Mode — Full theme toggle across all pages
- Responsive Design — Works across all screen sizes

---

## Project Structure

```
CampusFix/
├── index.html                   # Landing page
├── css/
│   ├── style.css                # Global design system
│   └── auth.css                 # Authentication page styles
├── html/
│   ├── login.html               # Portal selection and login
│   ├── student_register.html    # Student registration
│   ├── student_dashboard.html   # Student portal
│   ├── dept_head_dashboard.html # Department Head portal
│   └── admin_dashboard.html    # Admin portal
├── js/
│   ├── auth.js                  # Login and session logic
│   ├── dashboard.js             # Shared dashboard utilities
│   ├── student.js               # Student dashboard logic
│   ├── dept_head.js             # Department Head dashboard logic
│   ├── admin.js                 # Admin dashboard logic
│   └── validation.js            # Form validation helpers
├── database/
│   └── db.json                  # JSON Server database
└── Screenshot_of_site/          # UI screenshots
```

---

## How to Run Locally

**Step 1 — Install JSON Server**
```bash
npm install -g json-server
```

**Step 2 — Start the backend server**
```bash
cd CampusFix
npx json-server --watch database/db.json --port 3000
```

**Step 3 — Open the site**

Open `index.html` in your browser. The site is fully static — no build step required.

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@campusfix.com | admin@123 |
| Department Head (Electrical) | ramesh@gmail.com | password123 |
| Department Head (Plumbing) | suresh@gmail.com | password123 |
| Student | Register a new account from the site | — |

---

## Screenshots

### Landing Page

![Landing Page](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/1.png)

---

### About Section

![About Section](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/2.png)

---

### Problem Section — Why CampusFix Exists

![Problem Section](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/3.png)

---

### Login — Portal Selection

![Login Portal](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/4.png)

---

### Admin Dashboard — Campus Overview

![Admin Dashboard Overview](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/5.png)

---

### Admin Dashboard — Manage Departments

![Admin Departments](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/6.png)

---

### Student Dashboard — My Complaints

![Student Dashboard](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/7.png)

---

### Student Dashboard — Report an Issue

![Report Issue Form](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/8.png)

---

### Department Head Dashboard — Overview

![Dept Head Overview](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/9.png)

---

### Department Head Dashboard — Manage Employees

![Dept Head Employees](https://raw.githubusercontent.com/Satyam2006chh/CampusFix/main/Screenshot_of_site/10.png)

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure and semantic markup |
| CSS3 (Vanilla) | Styling, animations, dark and light theming |
| JavaScript ES6+ | All business logic, API calls, DOM manipulation |
| JSON Server | Lightweight REST API replacing a traditional backend |
| Google Fonts (Inter) | Typography |

No frameworks. No libraries. No shortcuts. Pure HTML, CSS, and JavaScript as required.

---

## License

This project was built as part of a college web development assignment.

---

<div align="center">
Made by the CampusFix Team
</div>
