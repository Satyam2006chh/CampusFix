-- ============================================================
--  CampusFix Database Schema
--  File: sql/schema.sql
--  Description: Complete table definitions for CampusFix
-- ============================================================

-- ─────────────────────────────────────────────
-- TABLE: departments
-- Stores all campus departments
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    dept_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    description   TEXT,
    category_tag  TEXT    NOT NULL,  -- 'electrical','water','civil','it','cleaning','security','hostel'
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABLE: users
-- Stores all users: students, dept_heads, admins
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('student','dept_head','admin')),
    department_id INTEGER,           -- NULL for students and admins
    roll_no       TEXT,              -- students only
    phone         TEXT,
    is_active     INTEGER DEFAULT 1, -- 1 = active, 0 = deactivated
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(dept_id)
);

-- ─────────────────────────────────────────────
-- TABLE: locations
-- Structured campus locations for complaint routing
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
    location_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    campus        TEXT    NOT NULL,
    block         TEXT    NOT NULL,
    floor         TEXT    NOT NULL,
    room_area     TEXT    NOT NULL
);

-- ─────────────────────────────────────────────
-- TABLE: employees
-- Staff members under each department head
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    employee_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    phone         TEXT,
    designation   TEXT    NOT NULL,
    department_id INTEGER NOT NULL,
    join_date     DATE,
    bio           TEXT,
    is_active     INTEGER DEFAULT 1,
    overdue_count INTEGER DEFAULT 0,  -- incremented when a deadline is breached
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(dept_id)
);

-- ─────────────────────────────────────────────
-- TABLE: complaints
-- Core table: every reported campus issue
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT    NOT NULL,
    description    TEXT    NOT NULL,
    category       TEXT    NOT NULL,
    location_id    INTEGER NOT NULL,
    photo_path     TEXT,
    urgency        TEXT    DEFAULT 'Medium' CHECK(urgency IN ('Low','Medium','High')),
    status         TEXT    DEFAULT 'Pending'
                           CHECK(status IN ('Pending','In Progress','Waiting Confirmation','Closed','Reopened','Overdue')),
    upvote_count   INTEGER DEFAULT 0,
    submitted_by   INTEGER NOT NULL,   -- user_id of student
    department_id  INTEGER,            -- auto-assigned based on category
    assigned_to    INTEGER,            -- employee_id
    assigned_by    INTEGER,            -- user_id of dept_head
    assigned_at    DATETIME,
    deadline       DATE,               -- resolution deadline set at assignment
    is_overdue     INTEGER DEFAULT 0,  -- 1 once deadline has been breached
    resolved_at    DATETIME,
    closed_at      DATETIME,
    reopen_reason  TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id)   REFERENCES locations(location_id),
    FOREIGN KEY (submitted_by)  REFERENCES users(user_id),
    FOREIGN KEY (department_id) REFERENCES departments(dept_id),
    FOREIGN KEY (assigned_to)   REFERENCES employees(employee_id),
    FOREIGN KEY (assigned_by)   REFERENCES users(user_id)
);

-- ─────────────────────────────────────────────
-- TABLE: complaint_upvotes
-- Tracks which students upvoted which complaints
-- Prevents duplicate upvotes and enables showing
-- upvoted complaints in the student's dashboard
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_upvotes (
    upvote_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complaint_id, user_id),   -- one upvote per student per complaint
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id),
    FOREIGN KEY (user_id)      REFERENCES users(user_id)
);
