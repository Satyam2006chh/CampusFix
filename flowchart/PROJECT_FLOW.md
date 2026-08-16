# 🚀 CampusFix — Complete Project Flow & Requirements Document

> A centralized college infrastructure problem reporting, tracking, resolution and knowledge system.
> **Tech Stack:** HTML, CSS, Vanilla JS (Frontend) | Python Flask (Backend) | SQLite/MySQL (Database) | Langchain (AI — Phase 2)

---

## 📌 TABLE OF CONTENTS

1. [Project Vision & Architecture](#1-project-vision--architecture)
2. [Why CampusFix? (The Problems We Solve)](#2-why-campusfix-the-problems-we-solve)
3. [Folder Structure](#3-folder-structure)
4. [Landing Page](#4-landing-page)
5. [Authentication System](#5-authentication-system)
6. [Student Role — Full Flow](#6-student-role--full-flow)
7. [Department Head Role — Full Flow](#7-department-head-role--full-flow)
8. [Admin Role — Full Flow](#8-admin-role--full-flow)
9. [Database Design (SQL)](#9-database-design-sql)
10. [Complaint Lifecycle — End to End](#10-complaint-lifecycle--end-to-end)
11. [AI Features — Phase 2 (Langchain)](#11-ai-features--phase-2-langchain)
12. [Git Commit Strategy](#12-git-commit-strategy)

---

## 1. Project Vision & Architecture

```
                    CAMPUSFIX
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     STUDENT         DEPT HEAD          ADMIN
     NORMAL            GOD             SUPERGOD
        │               │                │
        ▼               ▼                ▼
 Report Problem     Manage Issues     Manage Campus
 Track Problem      Manage Staff      Manage Departments
 AI Assistance      AI Assistance     AI Analytics
 Knowledge RAG      Knowledge RAG     Knowledge RAG
```

### System Architecture
```
Frontend (HTML/CSS/JS)
        │
        ▼ HTTP Requests (Fetch API)
Backend (Python — Flask)
        │
        ▼ SQL Queries
Database (SQLite for CE-1 / MySQL for CE-2)
        │
        ▼ (Phase 2 Only)
Langchain AI Layer
```

---

## 2. Why CampusFix? (The Problems We Solve)

### ❌ Problem 1 — Verbal Complaints Get Forgotten
Students report problems verbally to wardens. Wardens handle many students and many problems — complaints get forgotten, delayed, or overlooked.

### ❌ Problem 2 — No Complaint Tracking
Even after reporting a problem, students don't know:
- Was my complaint registered?
- Who is handling it?
- Has it been assigned?
- When will it be fixed?
- Is it still pending?

### ❌ Problem 3 — Slow & Disconnected Systems
Existing portals may take a long time to route complaints to the correct person. Students have no direct connection with the responsible department.

### ❌ Problem 4 — Students Don't Know Whom to Approach
If the water cooler in Block B stops working — does the student go to the warden? Faculty? Maintenance? Electrical? Plumbing? The student shouldn't have to navigate the college's internal hierarchy to fix a broken cooler.

### ❌ Problem 5 — Campus Problems Are Everywhere
Problems are not just in hostels. They occur in:
- 🚰 Water cooler / water leakage
- ⚡ Electricity / switches / fans
- 💻 Wi-Fi / computers / projectors
- 🪑 Broken chairs/desks
- 🚪 Doors/windows
- 🧹 Cleanliness/waste
- 🚿 Washroom problems
- 🏫 Classroom/lab infrastructure
- 🛡️ Security/CCTV issues

### ❌ Problem 6 — No Centralized Data
There is no single place for the college to see:
- How many problems exist
- Which departments have the most complaints
- Which locations have recurring problems
- Which complaints are overdue
- How quickly departments resolve issues

### ❌ Problem 7 — Duplicate Complaints
If 10 students find the same broken water cooler, all 10 might separately report it. CampusFix identifies similar complaints and allows students to upvote existing ones instead of creating duplicates.

### ❌ Problem 8 — No Transparency in Resolution
Current flow: `Student → tells someone → waits → asks again → waits again 😭`

CampusFix flow: `Student → Complaint → Correct Department → Dept Head → Staff → Resolution → Student Confirmation ✅`

### ❌ Problem 9 — No Accountability
If a complaint stays unresolved too long, nobody is held responsible. CampusFix introduces: Priority, Deadline/SLA, Overdue Status, Escalation, and Status History.

### ❌ Problem 10 — No Useful Data for Authorities
100 Wi-Fi complaints in Block B is not just 100 individual issues — it's a campus-level recurring infrastructure problem. CampusFix can detect patterns like:
- "Block B has unusually high Wi-Fi complaints."
- "Water leakage complaints increased by 35% this month."
- "Department X has 17 overdue complaints."

---

## 3. Folder Structure

```
CampusFix/
├── index.html                    ← Landing Page (entry point)
├── flowchart/
│   └── PROJECT_FLOW.md           ← This file
├── html/
│   ├── login.html                ← Role selection portal
│   ├── student_register.html     ← New student sign up
│   ├── student_dashboard.html    ← Student portal
│   ├── dept_head_dashboard.html  ← Department Head portal
│   └── admin_dashboard.html      ← Admin portal
├── css/
│   ├── style.css                 ← Global styles + landing page
│   ├── auth.css                  ← Login & registration styles
│   └── dashboard.css             ← Dashboard shared styles
├── js/
│   ├── auth.js                   ← Login, registration, session logic
│   ├── student.js                ← Student complaint logic
│   ├── dept_head.js              ← Dept head management logic
│   └── admin.js                  ← Admin management logic
├── sql/
│   ├── schema.sql                ← All CREATE TABLE statements
│   └── seed_data.sql             ← Sample data for demo
├── backend/
│   ├── app.py                    ← Flask application entry point
│   ├── routes/
│   │   ├── auth_routes.py        ← Login/Register API endpoints
│   │   ├── student_routes.py     ← Student complaint endpoints
│   │   ├── dept_head_routes.py   ← Dept head endpoints
│   │   └── admin_routes.py       ← Admin endpoints
│   └── database.py               ← DB connection & helper functions
└── assets/
    ├── logo.png                  ← CampusFix logo
    └── favicon.ico
```

---

## 4. Landing Page

**File:** `index.html` + `css/style.css`

### Sections:
1. **Navbar:** Logo (left) + "Login" button (right)
2. **Hero Section:** 
   - Big, bold "CampusFix" title with neon glow effect
   - Tagline: "One Platform. Every Campus Problem. Solved."
   - CTA Button: "Get Started" → goes to login
3. **About Section:** Brief description of what CampusFix is and how it works
4. **Problems Section:** Cards for each problem listed in Section 2 above
5. **Contact Us Section:** Simple contact form
6. **Footer:** Logo, copyright, links

### Design Theme:
- Dark background: `#0a0a0f` (near black)
- Neon accent: `#6c63ff` (purple/violet glow)
- Text: White and light grey
- Cards with glassmorphism effect
- Smooth scroll animations

---

## 5. Authentication System

**File:** `html/login.html` + `js/auth.js`

### Login Portal Flow:
```
Click "Login" in Navbar
        │
        ▼
Portal Selection Page
┌─────────────────┐
│  🔴 Admin       │ → Admin Email + Password → Admin Dashboard
│  🟡 Dept Head   │ → Dept Head Email + Password → Dept Dashboard
│  🟢 Student     │ → Student Email + Password → Student Dashboard
│     + Sign Up   │ → Registration Form → Student Dashboard
└─────────────────┘
```

### Key Rules:
- **Students** CAN self-register via the Sign Up page
- **Dept Heads** CANNOT self-register — Admin creates their account
- **Admins** CANNOT self-register — hardcoded in the database

### Password Security:
- Passwords stored as **bcrypt hashes** in the SQL database
- NEVER stored as plain text
- On login: entered password is compared against the hash using bcrypt
- Example stored value: `$2b$12$eImiTXuWVxfM37uY9Q...` (not the real password)

### Session Management:
- On successful login, the backend returns a **session token**
- Token stored in browser `sessionStorage`
- Every API request includes this token for authentication
- Token is cleared on logout

### User Status (is_active field):
- Every user has an `is_active` column in the database
- If Admin deactivates a Dept Head, `is_active = 0`
- On login, the backend checks `is_active` — if 0, login is rejected with "Account Disabled" message
- Historical data (complaints they resolved) is preserved — we NEVER delete users

---

## 6. Student Role — Full Flow

**File:** `html/student_dashboard.html` + `js/student.js`

### Dashboard UI:
```
┌─────────────────────────────────────────────┐
│  Sidebar         │  Main Content            │
│  ─────────       │  ─────────────────────   │
│  📊 Dashboard    │  📊 Stats Cards          │
│  📸 Report Issue │     Total | Resolved     │
│  📋 My Issues    │     Pending | In Progress│
│  🔔 Notifications│                          │
│  ⚙️ Settings     │  📋 My Active Complaints │
│                  │  ─────────────────────   │
│  [Logout]        │  [Complaint Cards]       │
└─────────────────────────────────────────────┘
```

### Feature 1: Report a Problem (Step-by-Step Form)

**Step 1 — Capture Image:**
- Upload photo or drag-and-drop
- Supported: JPG, PNG, WEBP

**Step 2 — Structured Location (Cascading Dropdowns):**
```
Select Campus     →  Select Block  →  Select Floor  →  Select Room/Area
(Main Campus)        (Block A/B/C)    (G/1/2/3)        (Lab 2, Corridor)
```
*Why structured?* Because later, the Admin SQL queries can do:
`GROUP BY block_name` to find: "Block B has 42% of all complaints"

**Step 3 — Problem Details:**
- **Title:** Short one-liner (e.g., "Fan not working in Lab 2")
- **Category Dropdown:**
  - ⚡ Electrical (fans, lights, AC, switches, wiring)
  - 🚰 Water & Plumbing (leakage, tap, drainage)
  - 🏗️ Civil & Infrastructure (doors, windows, walls, floor)
  - 💻 IT & Networking (Wi-Fi, computers, projector)
  - 🧹 Cleaning & Sanitation (garbage, washroom)
  - 🛡️ Security & Safety (CCTV, hazards)
  - 🏠 Hostel Maintenance
- **Description:** Free text area
- **Urgency:** Low / Medium / High

**Step 4 — Before Submit: Duplicate Check (SQL-based)**

When the student clicks "Submit", before saving to the database, the backend runs:
```sql
SELECT * FROM complaints 
WHERE category = ? AND location_id = ? AND status NOT IN ('Resolved', 'Closed')
LIMIT 1;
```
- If result is found → Show popup:
  > ⚠️ A similar complaint already exists!
  > Complaint #1042 — "Fan not working" — Status: In Progress
  > 👍 Upvote this complaint instead?
  > [ UPVOTE ]  [ SUBMIT AS NEW ]
- If UPVOTE clicked → Increment `upvote_count` on existing complaint and close the form
- If no duplicate found → Complaint is saved to the database

**Step 5 — Auto-Routing to Correct Department:**

The backend uses the complaint's `category` to automatically determine the correct department:
```
Category: Electrical → Electrical Department
Category: Water → Plumbing & Water Department
Category: IT → IT & Networking Department
```
The complaint is immediately visible on the correct Department Head's dashboard.

---

### Feature 2: My Complaints Dashboard

Each complaint card shows:
```
┌──────────────────────────────────────────┐
│  #1042  Projector not working            │
│  📍 Block B / Lab 2                      │
│  🟡 Status: In Progress                  │
│  👤 Assigned To: Raj Kumar               │
│  🏢 Department: IT & Infrastructure      │
│  📅 Reported: 14 Aug 2026               │
└──────────────────────────────────────────┘
```

Status badge colors:
- 🔵 Pending (just submitted, not yet picked up)
- 🟡 In Progress (dept head accepted, staff assigned)
- 🟠 Waiting Confirmation (dept head marked resolved)
- 🟢 Closed (student confirmed fixed)
- 🔴 Reopened (student said NOT fixed)

---

### Feature 3: YES/NO Confirmation (Feedback Loop)

When a Dept Head marks a complaint as "Resolved":
1. Student's dashboard shows: **"Your complaint has been marked as Resolved. Was it actually fixed?"**
2. Two buttons appear: **[ ✅ YES, It's Fixed ]** and **[ ❌ NO, Still Broken ]**

**If YES:**
- Complaint status → `CLOSED`
- Moved to "Past Complaints" history tab
- Department Head's "Resolved" count goes up by 1

**If NO:**
- Small popup: "What is still wrong?" (text box)
- Complaint status → `REOPENED`
- Complaint shoots back to the TOP of Dept Head's queue with a red `REOPENED` badge
- Admin can see departments with high reopen rates in analytics

---

## 7. Department Head Role — Full Flow

**File:** `html/dept_head_dashboard.html` + `js/dept_head.js`

### Key Rule: Department Silo
A Dept Head ONLY sees complaints related to their department. If I'm head of IT, I NEVER see a water leakage complaint. SQL enforces this:
```sql
SELECT * FROM complaints 
WHERE department_id = ? AND status = 'Pending'
ORDER BY urgency DESC;
```

### Dashboard UI:
```
┌──────────────────────────────────────────────────┐
│  Sidebar              │  Main Content            │
│  ──────────           │                          │
│  📊 Dashboard         │  Stats Cards:            │
│  👥 My Staff          │  🔴 Pending | 🟡 In Prog │
│  📋 Complaints        │  🟢 Resolved | 🔴 Reopen │
│  ⚙️  Settings         │                          │
│                       │  Active Complaint Queue  │
│  [Logout]             │  [Complaint Cards]       │
└──────────────────────────────────────────────────┘
```

---

### Feature 1: Staff Management (Employee Cards)

Page shows a grid of employee cards (exactly like the screenshots provided):
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  ⚙️ IT Dept  │  │  ⚙️ IT Dept  │  │  ⚙️ IT Dept  │
│              │  │              │  │              │
│    (R K)     │  │    (V S)     │  │    (M P)     │
│              │  │              │  │              │
│  Raj Kumar   │  │  Vikas Singh │  │  Mohit Patil │
│  Technician  │  │  Technician  │  │  Sr. Tech    │
│  🟢 Available│  │  🔴 Busy     │  │  🟢 Available│
│  [✏️] [🗑️]  │  │  [✏️] [🗑️] │  │  [✏️] [🗑️] │
└──────────────┘  └──────────────┘  └──────────────┘
                   [+ Add Employee]
```

### Add Employee Modal:
When "+ Add Employee" is clicked, a popup modal appears with:
- **Personal Info:** First Name, Last Name, Phone, Join Date, Bio (optional)
- **Employment Details:** Position/Designation (department is auto-set to their dept)
- **Login Credentials:** Email, Initial Password (set by the Head)
- On Save → Employee added to SQL `employees` table, card appears instantly

### Edit Employee:
- Click ✏️ on any card
- Same modal opens pre-filled with their data
- Save → SQL `UPDATE employees SET ...`

### Delete Employee:
- Click 🗑️ on any card
- Confirmation popup: "Are you sure? This cannot be undone."
- SQL: `UPDATE employees SET is_active = 0` (Soft delete, keeps history)

---

### Feature 2: Available vs. Busy (Smart Status)

**This is auto-calculated from the database. No manual toggle.**

```
Employee is 🟢 Available IF:
  SELECT COUNT(*) FROM complaints 
  WHERE assigned_to = employee_id 
  AND status IN ('Assigned', 'In Progress') = 0

Employee is 🔴 Busy IF:
  Same COUNT(*) > 0
```

When a complaint is assigned to Raj:
1. Raj's card flips to 🔴 Busy
2. When the complaint is resolved & confirmed, count drops to 0
3. Raj's card automatically flips back to 🟢 Available

This means the status is ALWAYS accurate. No bugs, no manual errors.

---

### Feature 3: Complaint Management

**Complaint Lifecycle (Dept Head's View):**

```
New Complaint Arrives (Pending)
        │
        ▼
Dept Head Reviews & Sets Priority
        │
        ▼
Assigns to Available Staff Member
  (Status → "In Progress")
        │
        ▼
Staff does physical work
        │
        ▼
Dept Head clicks "Mark as Resolved"
  (Status → "Waiting Confirmation")
        │
        ▼
Student clicks YES/NO
  YES → Status "Closed"
  NO  → Status "Reopened" (comes back!)
```

**Assigning a Ticket:**
When the Dept Head clicks "Assign" on a complaint, a popup shows:
```
Assign Complaint #1042

Available Staff:
✅ Raj Kumar       → [ Assign ]
❌ Vikas Singh     BUSY
✅ Mohit Patil     → [ Assign ]
```
On assignment:
- `complaints.assigned_to = employee_id`
- `complaints.assigned_at = NOW()`
- `complaints.status = 'In Progress'`
- Student's dashboard immediately shows "Assigned to: Raj Kumar"

---

## 8. Admin Role — Full Flow

**File:** `html/admin_dashboard.html` + `js/admin.js`

### Dashboard UI:

**Top Section — Analytics Cards with Department Filter:**
```
  [ All Departments ▼ ]  ← Dropdown Filter

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total        │ │ Pending      │ │ Resolved     │ │ Reopened     │
│ 1,284        │ │ 163          │ │ 1,021        │ │ 22           │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```
When a department is selected in the dropdown, all 4 numbers update instantly to show only that department's data.

**Charts Section:**
- 📊 Bar chart: Complaints by Department (SQL: `GROUP BY department_id, COUNT(*)`)
- 📊 Bar chart: Complaints by Location/Block (SQL: `GROUP BY block_name, COUNT(*)`)
- 📊 Line chart: Complaints by Month (SQL: `GROUP BY MONTH(created_at), COUNT(*)`)

---

### Feature 1: Department Management

Admin can:
1. **View All Departments** — Cards showing department name, head name, complaint count
2. **Create New Department** — Name, description, category
3. **Click on a Department Card** to:
   - See the current Dept Head
   - "Remove Dept Head" → `UPDATE users SET is_active = 0` (they are locked out)
   - "Assign New Dept Head" → Create login credentials for new person
4. **Delete Department** — Only if it has no active complaints

---

### Feature 2: User Management

**Create Dept Head:**
- Admin fills: Name, Email, Password, Department
- SQL: `INSERT INTO users (name, email, password_hash, role, department_id, is_active) VALUES (...)`
- That person can now log in with those credentials

**Deactivate/Remove Dept Head:**
- Admin clicks "Remove" on a Dept Head card
- SQL: `UPDATE users SET is_active = 0 WHERE user_id = ?`
- Old head is locked out immediately on next login attempt
- All their past resolved complaints are preserved in history

**Create Student (if needed):**
- Admin can also create student accounts manually

---

### Feature 3: Campus Location Management

Admin can manage the structured location data that appears in the Student's "Report Problem" dropdowns:
- Add/Remove Campus
- Add/Remove Block
- Add/Remove Floor
- Add/Remove Room/Area

This ensures the location dropdowns in the Student form always reflect the actual campus layout.

---

### Feature 4: Complaint Oversight

Admin can:
- **View ALL complaints** across ALL departments (no silos for Admin)
- **Escalate** a complaint (mark it urgent, notify the Dept Head)
- **Reassign** a complaint to a different department if it was wrongly categorized
- **Close** a complaint manually if needed
- **Filter** by: Department, Status, Date Range, Urgency, Location

---

## 9. Database Design (SQL)

**File:** `sql/schema.sql`

### Tables:

#### users
```sql
CREATE TABLE users (
  user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL,  -- 'student', 'dept_head', 'admin'
  department_id INTEGER,        -- NULL for students and admins
  roll_no       TEXT,           -- for students only
  phone         TEXT,
  is_active     INTEGER DEFAULT 1,  -- 1=active, 0=deactivated
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(dept_id)
);
```

#### departments
```sql
CREATE TABLE departments (
  dept_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT,
  category_tag  TEXT NOT NULL  -- 'electrical', 'water', 'it', etc.
);
```

#### locations
```sql
CREATE TABLE locations (
  location_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  campus        TEXT NOT NULL,
  block         TEXT NOT NULL,
  floor         TEXT NOT NULL,
  room_area     TEXT NOT NULL
);
```

#### employees (staff under dept heads)
```sql
CREATE TABLE employees (
  employee_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER,  -- links to users table for login
  name          TEXT NOT NULL,
  phone         TEXT,
  designation   TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  join_date     DATE,
  bio           TEXT,
  is_active     INTEGER DEFAULT 1,
  FOREIGN KEY (department_id) REFERENCES departments(dept_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

#### complaints
```sql
CREATE TABLE complaints (
  complaint_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL,
  location_id     INTEGER NOT NULL,
  photo_path      TEXT,
  urgency         TEXT DEFAULT 'Medium',  -- 'Low', 'Medium', 'High'
  status          TEXT DEFAULT 'Pending', -- 'Pending','In Progress','Resolved','Closed','Reopened'
  upvote_count    INTEGER DEFAULT 0,
  submitted_by    INTEGER NOT NULL,       -- student user_id
  department_id   INTEGER,               -- auto-assigned by category
  assigned_to     INTEGER,               -- employee_id
  assigned_by     INTEGER,               -- dept_head user_id
  assigned_at     DATETIME,
  resolved_at     DATETIME,
  closed_at       DATETIME,
  reopen_reason   TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (submitted_by) REFERENCES users(user_id),
  FOREIGN KEY (department_id) REFERENCES departments(dept_id),
  FOREIGN KEY (assigned_to) REFERENCES employees(employee_id)
);
```

### Key SQL Queries Demonstrated:

**Analytics by Department:**
```sql
SELECT d.name, COUNT(c.complaint_id) as total,
       SUM(CASE WHEN c.status='Resolved' THEN 1 ELSE 0 END) as resolved
FROM complaints c
JOIN departments d ON c.department_id = d.dept_id
GROUP BY d.dept_id
ORDER BY total DESC;
```

**Complaints by Location (Block):**
```sql
SELECT l.block, COUNT(c.complaint_id) as complaint_count
FROM complaints c
JOIN locations l ON c.location_id = l.location_id
GROUP BY l.block
ORDER BY complaint_count DESC;
```

**Available Employees:**
```sql
SELECT e.*, 
  CASE WHEN (
    SELECT COUNT(*) FROM complaints 
    WHERE assigned_to = e.employee_id 
    AND status IN ('Assigned','In Progress')
  ) > 0 THEN 'Busy' ELSE 'Available' END as availability
FROM employees e
WHERE e.department_id = ? AND e.is_active = 1;
```

---

## 10. Complaint Lifecycle — End to End

```
Student fills Report Form
        │
        ▼
Backend checks for SQL Duplicate
(same category + same location + active status)
        │
   ┌────┴────┐
   │         │
Duplicate   No Duplicate
Found       Found
   │         │
   ▼         ▼
Show Popup  Save Complaint to DB
Upvote or   status = 'Pending'
Submit New  dept auto-assigned by category
   │         │
   │         ▼
   │    Dept Head sees on dashboard
   │         │
   │         ▼
   │    Assigns to Available Staff
   │    status = 'In Progress'
   │         │
   │         ▼
   │    Student sees "Assigned to: Raj Kumar"
   │         │
   │         ▼
   │    Staff fixes the physical issue
   │         │
   │         ▼
   │    Dept Head clicks "Mark Resolved"
   │    status = 'Waiting Confirmation'
   │         │
   │         ▼
   │    Student gets YES/NO prompt
   │         │
   │    ┌────┴────┐
   │    │         │
   │   YES        NO
   │    │         │
   │    ▼         ▼
   │  CLOSED   REOPENED
   │           (back to top of Dept Queue!)
   │
   └──→ (Upvote increments existing complaint's upvote_count)
```

---

## 11. AI Features — Phase 2 (Langchain)

> ⚠️ These features will be added in CE-2 after the Node.js/Express backend is integrated. AI requires the backend to be fully set up first.

### Student AI Features:
1. **"Help Me Report" (Auto-Formatter):**
   - Student types in any language/slang: `"fan kharab hai aur awaz kr rha hai"`
   - Langchain LLM converts it to:
     ```
     Title: Ceiling Fan Producing Abnormal Noise
     Category: Electrical
     Description: The ceiling fan in the specified location is producing abnormal noise during operation.
     Priority: Medium
     ```

2. **"AI Duplicate Finder" (Vector Search — Enhanced):**
   - In CE-1, we use SQL exact matching for duplicates
   - In CE-2, we enhance with Langchain vector embeddings for SEMANTIC similarity (catches same problem described differently)

### Department Head AI Features:
3. **"Generate Department Summary":**
   - AI reads all this week's complaints for the department from SQL
   - Generates a readable English summary:
     > "This week, IT received 50 complaints. Most common: Wi-Fi issues in Block A (8 complaints). 3 are high priority. 45 resolved, 5 still pending."

### Admin AI Features:
4. **"Campus Intelligence" (Natural Language to SQL):**
   - Admin types: "What are the biggest infrastructure problems this month?"
   - AI converts this to an SQL query, runs it, and presents the result as a clean report

5. **"Policy RAG Assistant":**
   - Admin uploads: College Maintenance Policy PDFs, SOPs, Safety Guidelines
   - Admin types: "What is the procedure for closing a complaint?"
   - Langchain searches the documents and retrieves the exact relevant section

---

## 12. Git Commit Strategy

> All commits must be human-sounding, not AI-generated.

### Planned Commits:
```
git commit -m "initial project setup and folder structure"
git commit -m "added the campusfix logo and assets"
git commit -m "built the landing page hero section"
git commit -m "added about and problems section to homepage"
git commit -m "added contact section and footer to landing page"
git commit -m "added navbar with login button"
git commit -m "built the login portal with role selection"
git commit -m "added student registration form"
git commit -m "setup flask backend and database connection"
git commit -m "created sql schema for users and departments"
git commit -m "added complaint sql schema and seed data"
git commit -m "built student dashboard layout"
git commit -m "added report a problem form with location dropdowns"
git commit -m "wired up complaint submission to backend"
git commit -m "added sql duplicate check before complaint submit"
git commit -m "built department head dashboard layout"
git commit -m "added staff management with employee cards"
git commit -m "added add employee modal and form logic"
git commit -m "built complaint assignment system for dept head"
git commit -m "added available and busy status for employees"
git commit -m "built admin dashboard with analytics cards"
git commit -m "added department management for admin"
git commit -m "added user management for admin"
git commit -m "added yes no confirmation feedback loop for student"
git commit -m "fixed complaint reopened logic"
git commit -m "final ui polish and testing"
```

---

*Document maintained by: CampusFix Development Team*
*Last Updated: August 2026*
*CE-1 Phase — Tech Stack: HTML | CSS | Vanilla JS | Python Flask | SQLite*
