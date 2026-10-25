/**
 * seeder.js – Seed MongoDB with CampusFix initial data
 * Run: node seeder.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Department = require('./models/Department');
const Location = require('./models/Location');
const Complaint = require('./models/Complaint');
const Attendance = require('./models/Attendance');
const Leave = require('./models/Leave');
const Payslip = require('./models/Payslip');

const seed = async () => {
  await connectDB();

  try {
    // ── Clear existing data ──────────────────────────────────
    await Promise.all([
      User.deleteMany(),
      Department.deleteMany(),
      Location.deleteMany(),
      Complaint.deleteMany(),
      Attendance.deleteMany(),
      Leave.deleteMany(),
      Payslip.deleteMany(),
    ]);
    console.log('🗑️  Cleared existing data');

    // ── Departments ─────────────────────────────────────────
    const departments = await Department.insertMany([
      { name: 'Civil & Infrastructure',  description: 'civil',     category_tag: 'civil'      },
      { name: 'Cleaning & Sanitation',   description: 'cleaning',  category_tag: 'cleaning'   },
      { name: 'Electrical Department',   description: 'electrical',category_tag: 'electrical' },
      { name: 'Hostel Maintenance',      description: 'hostel',    category_tag: 'hostel'     },
      { name: 'IT & Networking',         description: 'it',        category_tag: 'it'         },
      { name: 'Plumbing & Water',        description: 'water',     category_tag: 'water'      },
      { name: 'Security & Safety',       description: 'security',  category_tag: 'security'   },
    ]);
    console.log(`✅ Seeded ${departments.length} departments`);

    const [carpentryDept, civilDept, elecDept, housekeepingDept, itDept, waterDept, securityDept] = departments;

    // ── Locations ───────────────────────────────────────────
    const locations = await Location.insertMany([
      { campus: 'Hostel',      block: 'Hostel Block A', floor: 'First Floor',  room_area: 'Room 101-110' },
      { campus: 'Hostel',      block: 'Hostel Block A', floor: 'Ground Floor', room_area: 'Common Room'  },
      { campus: 'Hostel',      block: 'Hostel Block B', floor: 'First Floor',  room_area: 'Room 201-210' },
      { campus: 'Hostel',      block: 'Hostel Block B', floor: 'Ground Floor', room_area: 'Washroom Block'},
      { campus: 'Main Campus', block: 'Block A',        floor: 'First Floor',  room_area: 'Classroom 101'},
      { campus: 'Main Campus', block: 'Block A',        floor: 'First Floor',  room_area: 'Classroom 102'},
      { campus: 'Main Campus', block: 'Block A',        floor: 'First Floor',  room_area: 'Washroom'     },
      { campus: 'Main Campus', block: 'Block A',        floor: 'Ground Floor', room_area: 'Lab 1'        },
      { campus: 'Main Campus', block: 'Block A',        floor: 'Ground Floor', room_area: 'Lab 2'        },
      { campus: 'Main Campus', block: 'Block A',        floor: 'Ground Floor', room_area: 'Corridor'     },
      { campus: 'Main Campus', block: 'Block B',        floor: 'First Floor',  room_area: 'Classroom 201'},
      { campus: 'Main Campus', block: 'Block B',        floor: 'First Floor',  room_area: 'Classroom 202'},
      { campus: 'Main Campus', block: 'Block B',        floor: 'Ground Floor', room_area: 'Lab 3'        },
      { campus: 'Main Campus', block: 'Block B',        floor: 'Ground Floor', room_area: 'Lab 4'        },
      { campus: 'Main Campus', block: 'Block B',        floor: 'Ground Floor', room_area: 'Corridor'     },
      { campus: 'Main Campus', block: 'Block B',        floor: 'Second Floor', room_area: 'Computer Lab' },
      { campus: 'Main Campus', block: 'Block C',        floor: 'First Floor',  room_area: 'Staff Room'   },
      { campus: 'Main Campus', block: 'Block C',        floor: 'First Floor',  room_area: 'Library'      },
      { campus: 'Main Campus', block: 'Block C',        floor: 'Ground Floor', room_area: 'Cafeteria'    },
      { campus: 'Main Campus', block: 'Block C',        floor: 'Ground Floor', room_area: 'Reception'    },
      { campus: 'Main Campus', block: 'Common Area',    floor: 'Ground Floor', room_area: 'Parking Lot'  },
      { campus: 'Main Campus', block: 'Common Area',    floor: 'Ground Floor', room_area: 'Main Gate'    },
    ]);
    console.log(`✅ Seeded ${locations.length} locations`);

    // ── Users ────────────────────────────────────────────────
    const users = await User.insertMany([
      // 1. Admin
      {
        name: 'Super Admin',
        email: 'admin@campusfix.com',
        password: await bcrypt.hash('admin@123', 10),
        role: 'admin',
        is_active: 1,
      },

      // 2. Department Heads
      {
        name: 'Ramesh',
        email: 'ramesh@gmail.com',
        password: await bcrypt.hash('password123', 10),
        role: 'dept_head',
        department_id: elecDept._id,
        is_active: 1,
      },
      {
        name: 'Suresh',
        email: 'suresh@gmail.com',
        password: await bcrypt.hash('password123', 10),
        role: 'dept_head',
        department_id: waterDept._id,
        is_active: 1,
      },
      {
        name: 'Kamlesh',
        email: 'kamlesh@gmail.com',
        password: await bcrypt.hash('Kamlesh@123', 10),
        role: 'dept_head',
        department_id: waterDept._id,
        phone: '8998988998',
        is_active: 1,
      },
      {
        name: 'Vijay Kumar',
        email: 'vijay@gmail.com',
        password: await bcrypt.hash('Vijay@123', 10),
        role: 'dept_head',
        department_id: civilDept._id,
        phone: '9876543210',
        is_active: 1,
      },

      // 3. Students
      {
        name: 'Satyam',
        email: 'satyam@gmail.com',
        roll_no: '2410993396',
        phone: '8998987678',
        password: await bcrypt.hash('Satyam@123', 10),
        role: 'student',
        is_active: 1,
      },
      {
        name: 'Raman',
        email: 'raman@gmail.com',
        roll_no: '2410993397',
        phone: '8998987679',
        password: await bcrypt.hash('Raman@123', 10),
        role: 'student',
        is_active: 1,
      },
      {
        name: 'Harsh',
        email: 'harsh@gmail.com',
        roll_no: '2410993398',
        phone: '8998987680',
        password: await bcrypt.hash('Harsh@123', 10),
        role: 'student',
        is_active: 1,
      },

      // 4. Employees – Electrical & Power
      {
        name: 'Vikram Singh',
        email: 'vikram@campusfix.com',
        password: await bcrypt.hash('Employee@123', 10),
        role: 'employee',
        department_id: elecDept._id,
        designation: 'Electrician',
        phone: '9876501111',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Anil Kumar',
        email: 'anil@campusfix.com',
        password: await bcrypt.hash('Employee@123', 10),
        role: 'employee',
        department_id: elecDept._id,
        designation: 'Senior Electrician',
        phone: '9876502222',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Kamal Kumar',
        email: 'kamal@gmail.com',
        password: await bcrypt.hash('Kamal@123', 10),
        role: 'employee',
        department_id: elecDept._id,
        designation: 'Junior Electrician',
        phone: '8877665544',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Devender Kumar',
        email: 'devender@gmail.com',
        password: await bcrypt.hash('Devender@123', 10),
        role: 'employee',
        department_id: elecDept._id,
        designation: 'Junior Helper',
        phone: '9988776655',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Raju mistri',
        email: 'raju@gmail.com',
        password: await bcrypt.hash('Raju@123', 10),
        role: 'employee',
        department_id: elecDept._id,
        designation: 'Dehadi',
        phone: '7788990011',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Bhuvan Sharma',
        email: 'bhuvan@gmail.com',
        password: await bcrypt.hash('bhuvan@2123', 10),
        role: 'employee',
        department_id: elecDept._id,
        designation: 'Super Senior',
        phone: '7878787878',
        availability: 'Available',
        is_active: 1,
      },

      // 5. Employees – Plumbing & Water
      {
        name: 'krishna',
        email: 'krishna@gmail.com',
        password: await bcrypt.hash('Krishna@123', 10),
        role: 'employee',
        department_id: waterDept._id,
        designation: 'Senior Plumber',
        phone: '8989898989',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Mohan Lal',
        email: 'mohan@campusfix.com',
        password: await bcrypt.hash('Employee@123', 10),
        role: 'employee',
        department_id: waterDept._id,
        designation: 'Plumber',
        phone: '9876504444',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Ravi Patel',
        email: 'ravi@campusfix.com',
        password: await bcrypt.hash('Employee@123', 10),
        role: 'employee',
        department_id: waterDept._id,
        designation: 'Senior Plumber',
        phone: '9876505555',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Santosh Yadav',
        email: 'santosh@campusfix.com',
        password: await bcrypt.hash('Employee@123', 10),
        role: 'employee',
        department_id: waterDept._id,
        designation: 'Pipe Fitter',
        phone: '9876506666',
        availability: 'Available',
        is_active: 1,
      },
      {
        name: 'Rajan Sharma',
        email: 'rajan@gmail.com',
        password: await bcrypt.hash('Rajan@123', 10),
        role: 'employee',
        department_id: waterDept._id,
        designation: 'Senior Plumber',
        phone: '7878787878',
        availability: 'Available',
        is_active: 1,
      },
    ]);
    console.log(`✅ Seeded ${users.length} users`);

    // Helper references for seeding related collections
    const satyam = users.find(u => u.email === 'satyam@gmail.com');
    const raman = users.find(u => u.email === 'raman@gmail.com');
    const krishna = users.find(u => u.email === 'krishna@gmail.com');
    const anil = users.find(u => u.email === 'anil@campusfix.com');
    const vikram = users.find(u => u.email === 'vikram@campusfix.com');
    const kamlesh = users.find(u => u.email === 'kamlesh@gmail.com');

    // ── Complaints ───────────────────────────────────────────
    const complaints = await Complaint.insertMany([
      {
        title: 'Fan not working in Lab 1',
        category: 'Electrical',
        location_id: locations[7]._id,
        location_desc: 'Block A, Ground Floor, Lab 1',
        urgency: 'High',
        description: 'Ceiling fan #2 in Lab 1 is making a humming sound and not spinning.',
        user_id: satyam._id,
        user_name: 'Satyam',
        status: 'In Progress',
        upvote_count: 3,
        assigned_to_id: vikram._id,
        assigned_to_name: 'Vikram Singh',
        deadline: '2026-10-28',
      },
      {
        title: 'Water not coming in Washroom',
        category: 'Plumbing & Water',
        location_id: locations[6]._id,
        location_desc: 'Block A, First Floor, Washroom',
        urgency: 'Medium',
        description: 'No running water in all three washroom taps since morning.',
        user_id: satyam._id,
        user_name: 'Satyam',
        status: 'Closed',
        upvote_count: 2,
        assigned_to_id: krishna._id,
        assigned_to_name: 'krishna',
        deadline: '2026-10-27',
      },
      {
        title: 'Monitor Burning Smell and No Display',
        category: 'Electrical',
        location_id: locations[2]._id,
        location_desc: 'Hostel Block B, Room 201-210',
        urgency: 'High',
        description: 'Burning odor coming from PC monitor in room while screen remains completely black. Fire hazard.',
        user_id: raman._id,
        user_name: 'Raman',
        status: 'Pending',
        upvote_count: 0,
        assigned_to_id: anil._id,
        assigned_to_name: 'Anil Kumar',
      },
      {
        title: 'Leaking Pipe under Cafeteria Sink',
        category: 'Plumbing & Water',
        location_id: locations[18]._id,
        location_desc: 'Block C, Ground Floor, Cafeteria',
        urgency: 'Medium',
        description: 'Constant water dripping from junction pipe under main hand-wash counter.',
        user_id: satyam._id,
        user_name: 'Satyam',
        status: 'In Progress',
        upvote_count: 1,
        assigned_to_id: krishna._id,
        assigned_to_name: 'krishna',
        deadline: '2026-10-29',
      },
      {
        title: 'Broken Desk Bench in Classroom 101',
        category: 'Carpentry & Furniture',
        location_id: locations[4]._id,
        location_desc: 'Block A, First Floor, Classroom 101',
        urgency: 'Low',
        description: 'Row 3 bench wooden plank has cracked and screws are loose.',
        user_id: raman._id,
        user_name: 'Raman',
        status: 'Pending',
        upvote_count: 0,
      },
      {
        title: 'Water Seepage on Corridor Wall',
        category: 'Civil & Infrastructure',
        location_id: locations[9]._id,
        location_desc: 'Block A, Ground Floor, Corridor',
        urgency: 'Medium',
        description: 'Plaster peeling and damp spots near water cooler area.',
        user_id: satyam._id,
        user_name: 'Satyam',
        status: 'Pending',
        upvote_count: 0,
      },
    ]);
    console.log(`✅ Seeded ${complaints.length} complaints`);

    // ── Attendance ───────────────────────────────────────────
    const attendances = await Attendance.insertMany([
      {
        employee_id: krishna._id,
        date: '2026-10-25',
        clock_in: '08:50',
        clock_out: '17:05',
        working_hours: 8.25,
        day_type: 'Regular',
        status: 'Present',
        department_id: waterDept._id,
      },
      {
        employee_id: vikram._id,
        date: '2026-10-25',
        clock_in: '08:45',
        clock_out: '17:00',
        working_hours: 8.25,
        day_type: 'Regular',
        status: 'Present',
        department_id: elecDept._id,
      },
    ]);
    console.log(`✅ Seeded ${attendances.length} attendance records`);

    // ── Leaves ───────────────────────────────────────────────
    const leaves = await Leave.insertMany([
      {
        employee_id: krishna._id,
        employee_name: 'krishna',
        department_id: waterDept._id,
        leave_type: 'Sick Leave',
        from_date: '2026-10-26',
        to_date: '2026-10-28',
        reason: 'Viral fever and doctor advised rest',
        status: 'Approved',
        reviewed_by: 'kamlesh',
        reviewed_at: '2026-10-25',
      },
      {
        employee_id: vikram._id,
        employee_name: 'Vikram Singh',
        department_id: elecDept._id,
        leave_type: 'Casual Leave',
        from_date: '2026-11-02',
        to_date: '2026-11-03',
        reason: 'Personal family commitments',
        status: 'Pending',
      },
    ]);
    console.log(`✅ Seeded ${leaves.length} leave requests`);

    // ── Payslips ─────────────────────────────────────────────
    const payslips = await Payslip.insertMany([
      {
        employee_id: krishna._id,
        employee_name: 'krishna',
        department_id: waterDept._id,
        month: 10,
        year: 2026,
        basic_salary: 34000,
        allowances: 900,
        deductions: 0,
        net_salary: 34900,
        generated_by: 'suresh',
      },
      {
        employee_id: vikram._id,
        employee_name: 'Vikram Singh',
        department_id: elecDept._id,
        month: 10,
        year: 2026,
        basic_salary: 32000,
        allowances: 800,
        deductions: 500,
        net_salary: 32300,
        generated_by: 'ramesh',
      },
    ]);
    console.log(`✅ Seeded ${payslips.length} payslips`);

    console.log('\n🎉 ALL COLLECTIONS SUCCESSFULLY SEEDED IN MONGODB ATLAS!');
    console.log('\n📋 Login credentials summary:');
    console.log('  Admin:      admin@campusfix.com  / admin@123');
    console.log('  Dept Head:  ramesh@gmail.com     / password123  (Electrical)');
    console.log('  Dept Head:  suresh@gmail.com     / password123  (Plumbing)');
    console.log('  Dept Head:  kamlesh@gmail.com    / Kamlesh@123  (Plumbing)');
    console.log('  Dept Head:  vijay@gmail.com      / Vijay@123    (Civil)');
    console.log('  Student:    satyam@gmail.com     / Satyam@123');
    console.log('  Student:    raman@gmail.com      / Raman@123');
    console.log('  Student:    harsh@gmail.com      / Harsh@123');
    console.log('  Employees:  krishna, vikram, anil, mohan, ravi, santosh, kamal, devender, raju, bhuvan, rajan');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

seed();
