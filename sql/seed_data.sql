-- ============================================================
--  CampusFix Seed Data
--  File: sql/seed_data.sql
--  Description: Initial data for departments, locations, and admin user
-- ============================================================

-- ─────────────────────────────────────────────
-- DEPARTMENTS (pre-defined, created by system)
-- ─────────────────────────────────────────────
INSERT INTO departments (name, description, category_tag) VALUES
('Electrical Department',     'Handles fans, lights, switches, wiring, AC, and all electrical infrastructure.', 'electrical'),
('Plumbing & Water',          'Handles water leakage, pipes, taps, washrooms, drainage, and water supply.',      'water'),
('Civil & Infrastructure',    'Handles walls, floors, doors, windows, ceilings, furniture, and structural issues.', 'civil'),
('IT & Networking',           'Handles Wi-Fi, computers, printers, projectors, smart boards, and network infrastructure.', 'it'),
('Cleaning & Sanitation',     'Handles garbage, washroom cleaning, waste management, and campus hygiene.',        'cleaning'),
('Security & Safety',         'Handles CCTV, security equipment, emergency infrastructure, and safety hazards.', 'security'),
('Hostel Maintenance',        'Handles hostel rooms, hostel electrical, hostel water, and common areas.',         'hostel');

-- ─────────────────────────────────────────────
-- LOCATIONS (campus structure)
-- ─────────────────────────────────────────────
INSERT INTO locations (campus, block, floor, room_area) VALUES
('Main Campus', 'Block A', 'Ground Floor', 'Lab 1'),
('Main Campus', 'Block A', 'Ground Floor', 'Lab 2'),
('Main Campus', 'Block A', 'Ground Floor', 'Corridor'),
('Main Campus', 'Block A', 'First Floor',  'Classroom 101'),
('Main Campus', 'Block A', 'First Floor',  'Classroom 102'),
('Main Campus', 'Block A', 'First Floor',  'Washroom'),
('Main Campus', 'Block B', 'Ground Floor', 'Lab 3'),
('Main Campus', 'Block B', 'Ground Floor', 'Lab 4'),
('Main Campus', 'Block B', 'Ground Floor', 'Corridor'),
('Main Campus', 'Block B', 'First Floor',  'Classroom 201'),
('Main Campus', 'Block B', 'First Floor',  'Classroom 202'),
('Main Campus', 'Block B', 'Second Floor', 'Computer Lab'),
('Main Campus', 'Block C', 'Ground Floor', 'Cafeteria'),
('Main Campus', 'Block C', 'Ground Floor', 'Reception'),
('Main Campus', 'Block C', 'First Floor',  'Staff Room'),
('Main Campus', 'Block C', 'First Floor',  'Library'),
('Main Campus', 'Common Area', 'Ground Floor', 'Parking Lot'),
('Main Campus', 'Common Area', 'Ground Floor', 'Main Gate'),
('Hostel',      'Hostel Block A', 'Ground Floor', 'Common Room'),
('Hostel',      'Hostel Block A', 'First Floor',  'Room 101-110'),
('Hostel',      'Hostel Block B', 'Ground Floor', 'Washroom Block'),
('Hostel',      'Hostel Block B', 'First Floor',  'Room 201-210');

-- ─────────────────────────────────────────────
-- ADMIN USER
-- Default admin credentials: admin@campusfix.com / admin123
-- Password hash is bcrypt of 'admin123'
-- ─────────────────────────────────────────────
INSERT INTO users (name, email, password_hash, role, is_active) VALUES
('Super Admin', 'admin@campusfix.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfzPobKwfSm9LMCMC', 'admin', 1);
