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

    console.log('\n🎉 Database seeded successfully!');
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
