const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const Location = require('../models/Location');
const Complaint = require('../models/Complaint');

async function seed50PlusComplaints() {
  await connectDB();
  console.log('⚡ Connected to MongoDB for seeding 50+ genuine complaints...');

  // 1. Fetch departments
  const departments = await Department.find();
  const deptMap = {};
  departments.forEach(d => {
    deptMap[d.category_tag.toLowerCase()] = d;
    deptMap[d.name.toLowerCase()] = d;
  });

  const civilDept = deptMap['civil'] || departments[0];
  const cleanDept = deptMap['cleaning'] || departments[1];
  const elecDept = deptMap['electrical'] || departments[2];
  const hostelDept = deptMap['hostel'] || departments[3];
  const itDept = deptMap['it'] || departments[4];
  const waterDept = deptMap['water'] || departments[5];
  const secDept = deptMap['security'] || departments[6];

  // 2. Fetch locations
  const locations = await Location.find();
  if (locations.length === 0) {
    throw new Error('No locations found in database.');
  }

  // 3. Ensure Department Heads for all 7 departments
  const headData = [
    { name: 'Ramesh Sharma', email: 'ramesh.head@campusfix.com', dept: elecDept._id, phone: '9876501101' },
    { name: 'Suresh Verma', email: 'suresh.head@campusfix.com', dept: waterDept._id, phone: '9876501102' },
    { name: 'Vijay Kumar', email: 'vijay.head@campusfix.com', dept: cleanDept._id, phone: '9876501103' },
    { name: 'Rajeev Malhotra', email: 'rajeev.head@campusfix.com', dept: civilDept._id, phone: '9876501104' },
    { name: 'Sanjay Aggarwal', email: 'sanjay.head@campusfix.com', dept: itDept._id, phone: '9876501105' },
    { name: 'Sunita Mehra', email: 'sunita.head@campusfix.com', dept: hostelDept._id, phone: '9876501106' },
    { name: 'Col. Rajesh Bakshi', email: 'rajesh.head@campusfix.com', dept: secDept._id, phone: '9876501107' },
  ];

  const defaultPassword = await bcrypt.hash('password123', 10);

  for (const h of headData) {
    let existingHead = await User.findOne({ email: h.email });
    if (!existingHead) {
      await User.create({
        name: h.name,
        email: h.email,
        password: defaultPassword,
        role: 'dept_head',
        department_id: h.dept,
        phone: h.phone,
        is_active: 1
      });
      console.log(`✓ Created Dept Head: ${h.name} (${h.email})`);
    }
  }

  // 4. Ensure workers/employees across all departments
  const workerData = [
    // Electrical
    { name: 'Vikram Singh', email: 'vikram.elec@campusfix.com', dept: elecDept._id, designation: 'Electrician' },
    { name: 'Anil Kumar', email: 'anil.elec@campusfix.com', dept: elecDept._id, designation: 'HVAC Technician' },
    { name: 'Devender Kumar', email: 'devender.elec@campusfix.com', dept: elecDept._id, designation: 'Senior Electrician' },
    // Plumbing / Water
    { name: 'Mohan Lal', email: 'mohan.water@campusfix.com', dept: waterDept._id, designation: 'Senior Plumber' },
    { name: 'Ravi Patel', email: 'ravi.water@campusfix.com', dept: waterDept._id, designation: 'Plumbing Assistant' },
    { name: 'Santosh Yadav', email: 'santosh.water@campusfix.com', dept: waterDept._id, designation: 'Pipe Fitter' },
    // Cleaning
    { name: 'Rameshwar Dayal', email: 'rameshwar.clean@campusfix.com', dept: cleanDept._id, designation: 'Sanitation Lead' },
    { name: 'Geeta Devi', email: 'geeta.clean@campusfix.com', dept: cleanDept._id, designation: 'Floor Custodian' },
    { name: 'Manoj Prasad', email: 'manoj.clean@campusfix.com', dept: cleanDept._id, designation: 'Waste Management Worker' },
    // Civil
    { name: 'Harish Chander', email: 'harish.civil@campusfix.com', dept: civilDept._id, designation: 'Mason / Carpenter' },
    { name: 'Jagdish Rao', email: 'jagdish.civil@campusfix.com', dept: civilDept._id, designation: 'Civil Maintenance Hand' },
    // IT & Network
    { name: 'Amitabh Sengupta', email: 'amitabh.it@campusfix.com', dept: itDept._id, designation: 'Network Engineer' },
    { name: 'Pradeep Rawat', email: 'pradeep.it@campusfix.com', dept: itDept._id, designation: 'Hardware Support Tech' },
    // Hostel
    { name: 'Kailash Nath', email: 'kailash.hostel@campusfix.com', dept: hostelDept._id, designation: 'Hostel Maintenance Supervisor' },
    { name: 'Pappu Ram', email: 'pappu.hostel@campusfix.com', dept: hostelDept._id, designation: 'Hostel Handyman' },
    // Security
    { name: 'Subedar Gurmail Singh', email: 'gurmail.sec@campusfix.com', dept: secDept._id, designation: 'Safety Marshall' },
    { name: 'Dharmender Thapa', email: 'dharmender.sec@campusfix.com', dept: secDept._id, designation: 'Surveillance Tech' }
  ];

  const workersByDept = {};
  for (const w of workerData) {
    let worker = await User.findOne({ email: w.email });
    if (!worker) {
      worker = await User.create({
        name: w.name,
        email: w.email,
        password: defaultPassword,
        role: 'employee',
        department_id: w.dept,
        designation: w.designation,
        is_active: 1
      });
      console.log(`✓ Created Worker: ${w.name} (${w.designation})`);
    }
    const dId = String(w.dept);
    if (!workersByDept[dId]) workersByDept[dId] = [];
    workersByDept[dId].push(worker);
  }

  // 5. Ensure 20 diverse students
  const studentNames = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@chitkara.edu.in' },
    { name: 'Ananya Verma', email: 'ananya.verma@chitkara.edu.in' },
    { name: 'Rohan Gupta', email: 'rohan.gupta@chitkara.edu.in' },
    { name: 'Priya Nair', email: 'priya.nair@chitkara.edu.in' },
    { name: 'Harshvardhan Singh', email: 'harsh.singh@chitkara.edu.in' },
    { name: 'Sneha Patel', email: 'sneha.patel@chitkara.edu.in' },
    { name: 'Aditya Roy', email: 'aditya.roy@chitkara.edu.in' },
    { name: 'Ishita Sengupta', email: 'ishita.sengupta@chitkara.edu.in' },
    { name: 'Tanmay Joshi', email: 'tanmay.joshi@chitkara.edu.in' },
    { name: 'Riya Mukherjee', email: 'riya.mukherjee@chitkara.edu.in' },
    { name: 'Meera Iyer', email: 'meera.iyer@chitkara.edu.in' },
    { name: 'Siddharth Kapoor', email: 'siddharth.kapoor@chitkara.edu.in' },
    { name: 'Diya Malhotra', email: 'diya.malhotra@chitkara.edu.in' },
    { name: 'Varun Chopra', email: 'varun.chopra@chitkara.edu.in' },
    { name: 'Natasha Rao', email: 'natasha.rao@chitkara.edu.in' },
    { name: 'Kabir Das', email: 'kabir.das@chitkara.edu.in' },
    { name: 'Simran Kaur', email: 'simran.kaur@chitkara.edu.in' },
    { name: 'Ayush Goel', email: 'ayush.goel@chitkara.edu.in' },
    { name: 'Kavya Pillai', email: 'kavya.pillai@chitkara.edu.in' },
    { name: 'Nikhil Saxena', email: 'nikhil.saxena@chitkara.edu.in' }
  ];

  const students = [];
  for (const s of studentNames) {
    let student = await User.findOne({ email: s.email });
    if (!student) {
      student = await User.create({
        name: s.name,
        email: s.email,
        password: defaultPassword,
        role: 'student',
        is_active: 1
      });
    }
    students.push(student);
  }
  console.log(`✓ Loaded ${students.length} students for filing complaints.`);

  // 6. Comprehensive dataset of 56 genuine complaints
  const genuineComplaintsDataset = [
    // ── ELECTRICAL (8 complaints) ──
    {
      title: 'Sparking switchboard and burning smell near desk 14',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'High',
      desc: 'The master socket cluster near desk 14 is crackling with visible blue sparks when plugging in laptops. Strong burning insulation smell detected by students during lab.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-26'
    },
    {
      title: 'Ceiling fan bearing failure vibrating violently in Room 204',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'Medium',
      desc: 'The central ceiling fan bearing has worn out, producing a deafening screeching noise and wobbling severely at speed setting 3. Risk of bracket loosening.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-28'
    },
    {
      title: 'Flickering LED tube lights during afternoon lectures',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'Low',
      desc: 'Three LED fixtures in Row 4 are strobing intermittently for the past three days, causing eye fatigue and headaches for students during 2-hour classes.',
      status: 'Pending',
      blockKeyword: 'Block B',
      deadline: '2026-10-30'
    },
    {
      title: 'Substation circuit breaker tripping repeatedly in Faraday Hall',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'High',
      desc: 'Whenever both high-precision microwave analyzers are turned on, the 32A MCB trips instantly. Needs breaker load recalibration and fuse inspection.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-26'
    },
    {
      title: 'Air conditioner compressor shutoff causing room overheating',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'Medium',
      desc: 'The 2-ton split AC in Seminar Room 102 displays an E4 error code after 10 minutes of operation and only blows ambient hot air during seminars.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-29'
    },
    {
      title: 'Broken extension board with bare wires in Project Lab',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'High',
      desc: 'The heavy-duty extension roll has frayed insulation exposing live copper strands right near the solder station table.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-27'
    },
    {
      title: 'Emergency exit sign light completely dark in corridor',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'Low',
      desc: 'The backlit green emergency egress sign at the West staircase landing is not illuminated. Battery backup seems depleted.',
      status: 'Closed',
      blockKeyword: 'Common Area',
      deadline: '2026-10-24'
    },
    {
      title: 'Classroom podium power inlet socket loose',
      category: elecDept.name,
      deptId: elecDept._id,
      urgency: 'Low',
      desc: 'The instructor podium microphone and laptop charger connection cuts out if the desk is bumped. Plastic casing is cracked.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-31'
    },

    // ── PLUMBING & WATER (8 complaints) ──
    {
      title: 'Continuous flush tank leak causing water cascade in washroom',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'Medium',
      desc: 'Dual flush cistern float valve is stuck open in cubicle 3. Clean water is continuously overflowing onto the floor and draining into corridor.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-27'
    },
    {
      title: 'Severe low water pressure in 2nd floor restrooms',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'High',
      desc: 'Taps and urinals on the second floor have zero water pressure since morning. Handwashing is impossible for over 200 students during break.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-26'
    },
    {
      title: 'RO Drinking Water dispenser leaking from internal filter canister',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'Medium',
      desc: 'The central drinking cooler near the library entrance is leaking from beneath the stainless steel tray, creating a slipping hazard on tile flooring.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-27'
    },
    {
      title: 'Chemistry Lab wash sink drain completely clogged with precipitate',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'Medium',
      desc: 'The acid-resistant sink in workstation bay 4 has backed up with murky standing water. Chemical smells are rising from the U-trap.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-28'
    },
    {
      title: 'Overhead PVC water pipe joint dripping above false ceiling',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'High',
      desc: 'Water stains have expanded across three ceiling tiles in the faculty corridor. Water droplets are falling directly over the ethernet switch rack.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-26'
    },
    {
      title: 'Water cooler dispensing tepid water with odd metallic aftertaste',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'Low',
      desc: 'The cooling compressor is not chilling water and several students reported a strong mineral/metallic odor from the tap.',
      status: 'Pending',
      blockKeyword: 'Block A',
      deadline: '2026-11-01'
    },
    {
      title: 'Broken tap nozzle spraying pressurized mist across mirror',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'Low',
      desc: 'The aerator thread has sheared off. When turned on, water blasts sideways soaking clothes and mirror.',
      status: 'Closed',
      blockKeyword: 'Block B',
      deadline: '2026-10-24'
    },
    {
      title: 'Underground sprinkler pipe cracked flooding garden pathway',
      category: waterDept.name,
      deptId: waterDept._id,
      urgency: 'Medium',
      desc: 'A ruptured underground pipe has created a large puddle that submerges the walking path connecting Block A to the canteen.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-29'
    },

    // ── CLEANING & SANITATION (8 complaints) ──
    {
      title: 'Chemical reagent spill on Lab floor requiring neutralizer',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'High',
      desc: 'A 500ml bottle of dilute hydrochloric solution slipped from a lab rack. Immediate custodial spill kit and absorbent pads required.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-26'
    },
    {
      title: 'Overflowing recycle and compost bins outside cafeteria entrance',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Medium',
      desc: 'Paper cups, juice containers, and food wrappers are spilling onto the ground. Staggered post-lunch cleaning run is urgently needed.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-27'
    },
    {
      title: 'Dust accumulation in ventilation grilles of Seminar Hall A',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Low',
      desc: 'Heavy cobwebs and black dust have collected along the return air diffusers, aggravating allergies during guest lectures.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-31'
    },
    {
      title: 'Slippery soapy floor in washroom entrance without caution cone',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Medium',
      desc: 'Mopping was done using excess detergent without placing wet floor warning cones. Two students slipped near the threshold this morning.',
      status: 'Closed',
      blockKeyword: 'Block A',
      deadline: '2026-10-25'
    },
    {
      title: 'Stained magnetic whiteboards requiring specialized residue remover',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Low',
      desc: 'Permanent markers were accidentally used on both front whiteboards in Room 305. Standard dry eraser cannot clean it.',
      status: 'Pending',
      blockKeyword: 'Block A',
      deadline: '2026-10-30'
    },
    {
      title: 'Stagnant water and trash in outdoor drainage trough',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Medium',
      desc: 'Leaves and plastic food wrappers have formed a dam in the storm trench behind Block B, emitting foul odors and attracting gnats.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-28'
    },
    {
      title: 'Sanitary disposal bin damaged and overflowing in female washroom',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Medium',
      desc: 'Pedal bin mechanism is broken and liner has not been replaced today on the 1st floor ladies room.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-27'
    },
    {
      title: 'Chewing gum and sticky soda residue on auditorium armrests',
      category: cleanDept.name,
      deptId: cleanDept._id,
      urgency: 'Low',
      desc: 'Rows 6 to 9 in the main auditorium have sticky spills left over from the orientation event.',
      status: 'Closed',
      blockKeyword: 'Common Area',
      deadline: '2026-10-24'
    },

    // ── CIVIL & INFRASTRUCTURE (8 complaints) ──
    {
      title: 'Loose staircase step tile causing severe tripping hazard',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'High',
      desc: 'The nosing tile on the 4th step of Staircase 2 has detached completely. When stepped on, it rocks forward and has nearly caused falls.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-26'
    },
    {
      title: 'Door lock cylinder jammed in Room 108 preventing entry',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'Medium',
      desc: 'Key turns partially but fails to retract the heavy deadbolt. Students and professors were locked out for 20 minutes before class.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-27'
    },
    {
      title: 'Cracked window pane rattling loudly during gusty winds',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'Medium',
      desc: 'A diagonal fracture spanning 3 feet has appeared on the 2nd floor corridor window. Glass vibrates dangerously during rain.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-29'
    },
    {
      title: 'Classroom bench desk support screw sheared off',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'Low',
      desc: 'The wooden desk plank in Row 2 tilts downward under laptop weight because the left steel bracket bolt is missing.',
      status: 'Pending',
      blockKeyword: 'Block A',
      deadline: '2026-11-02'
    },
    {
      title: 'Plaster flaking off ceiling corner near fire sprinkler',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'Medium',
      desc: 'Dampness from roof has caused large flakes of concrete plaster to peel off and fall onto the corridor floor.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-30'
    },
    {
      title: 'Disabled wheelchair ramp handrail wobbling at anchor point',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'High',
      desc: 'The stainless steel railing at the Block C entrance ramp has broken its concrete sleeve anchor. Cannot bear user weight safely.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-27'
    },
    {
      title: 'Restroom door hydraulic closer missing oil damping',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'Low',
      desc: 'The heavy fire-rated door slams shut with a loud acoustic thud that disturbs surrounding exam rooms.',
      status: 'Closed',
      blockKeyword: 'Block A',
      deadline: '2026-10-24'
    },
    {
      title: 'Paver stones uneven and sinking near cafeteria portico',
      category: civilDept.name,
      deptId: civilDept._id,
      urgency: 'Low',
      desc: 'Heavy delivery carts have caused paver blocks to sink by 2 inches, creating puddles and stumble spots for pedestrians.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-11-03'
    },

    // ── IT & NETWORKING (8 complaints) ──
    {
      title: 'Wi-Fi access point dropping connections every 5 minutes in Library',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'High',
      desc: 'Cisco AP in the 2nd floor quiet reading zone is intermittently broadcasting SSID but refusing DHCP leases. Over 60 students unable to access portal.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-26'
    },
    {
      title: 'Projector ceiling mount HDMI port broken in Lecture Hall 202',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'Medium',
      desc: 'The wall plate HDMI connector pin is bent. Presentations flick to black screen whenever the lecturer touches the cable.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-28'
    },
    {
      title: 'Ethernet RJ45 jack displaced into wall cavity in Lab 3',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'Low',
      desc: 'Station 22 faceplate was pushed into the drywall. Network cable cannot be inserted without pulling the keystone out.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-31'
    },
    {
      title: 'High latency and packet loss during online proctored tests',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'High',
      desc: 'Ping times exceeding 450ms with 15% packet loss across VLAN 40. Students taking certification exams got disconnected twice.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-26'
    },
    {
      title: 'Smart classroom interactive digital board touchscreen uncalibrated',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'Medium',
      desc: 'Touch input is offset by roughly 4 inches to the bottom-right. Writing with the stylus draws erratic lines.',
      status: 'Pending',
      blockKeyword: 'Block B',
      deadline: '2026-10-30'
    },
    {
      title: 'Biometric fingerprint reader failing cold clock-ins',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'Medium',
      desc: 'Optical sensor surface is heavily scratched and rejects over half the department staff attendance punches in the morning.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-29'
    },
    {
      title: 'Audio amplifier buzzing noise through ceiling speakers',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'Low',
      desc: 'Persistent 60Hz ground loop hum coming through PA system speakers in Room 301 even when microphone is switched off.',
      status: 'Closed',
      blockKeyword: 'Block B',
      deadline: '2026-10-24'
    },
    {
      title: 'Lab computer station 17 continuous memory beep code on boot',
      category: itDept.name,
      deptId: itDept._id,
      urgency: 'Low',
      desc: 'Dell OptiPlex desktop in CAD lab gives 3 amber blinks indicating faulty RAM stick reseat required.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-11-01'
    },

    // ── HOSTEL MAINTENANCE (8 complaints) ──
    {
      title: 'Hostel bathroom geyser tripping MCB within 2 minutes of heating',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'High',
      desc: 'The 25L storage water heater on the 2nd floor East wing trips the bathroom breaker every time elements engage. Heating coil scale short circuit suspected.',
      status: 'In Progress',
      blockKeyword: 'Hostel Block A',
      deadline: '2026-10-26'
    },
    {
      title: 'Mosquito window wire mesh torn letting insects into room',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Medium',
      desc: 'The sliding nylon mesh frame has a 6-inch gash. Residents on the ground floor are experiencing mosquito bites and cannot open windows.',
      status: 'In Progress',
      blockKeyword: 'Hostel Block B',
      deadline: '2026-10-29'
    },
    {
      title: 'Steel study wardrobe lock mechanism misaligned in Room 218',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Low',
      desc: 'The padlock hasp doesn’t close because the wardrobe door hinge has sagged downward by half an inch.',
      status: 'Pending',
      blockKeyword: 'Hostel Block A',
      deadline: '2026-11-02'
    },
    {
      title: 'Hostel corridor drinking water cooler dispensing warm water',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Medium',
      desc: 'Students returning from classes have no cold drinking water on the 1st floor wing. Condenser fan is not spinning.',
      status: 'In Progress',
      blockKeyword: 'Hostel Block B',
      deadline: '2026-10-28'
    },
    {
      title: 'Bunk bed frame weld joint loose and creaking excessively',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Medium',
      desc: 'Top bunk ladder mount and support crossbeam have a hairline crack at the weld spot. Safety hazard when student climbs up.',
      status: 'In Progress',
      blockKeyword: 'Hostel Block A',
      deadline: '2026-10-27'
    },
    {
      title: 'Balcony rainwater drain outlet blocked with dry leaves',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Low',
      desc: 'Water accumulates 3 inches deep on the common balcony after heavy rainfall and seeps under room doors.',
      status: 'Closed',
      blockKeyword: 'Hostel Block B',
      deadline: '2026-10-24'
    },
    {
      title: 'Hostel mess dining chair legs missing rubber bushes',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Low',
      desc: 'Metal chair legs produce loud screeching on terrazzo floor during breakfast and dinner hours.',
      status: 'In Progress',
      blockKeyword: 'Hostel Block A',
      deadline: '2026-11-03'
    },
    {
      title: 'Shower head spray blocked by heavy mineral scaling',
      category: hostelDept.name,
      deptId: hostelDept._id,
      urgency: 'Low',
      desc: 'Only 3 tiny streams of water come out of the shower rose in Cubicle 2. Descaling or replacement required.',
      status: 'In Progress',
      blockKeyword: 'Hostel Block B',
      deadline: '2026-10-31'
    },

    // ── SECURITY & SAFETY (8 complaints) ──
    {
      title: 'Emergency exit push-bar latch jammed shut at Ground Floor',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'High',
      desc: 'The panic exit door leading to the assembly ground cannot be pushed open from inside. Violation of campus fire safety protocols.',
      status: 'In Progress',
      blockKeyword: 'Block A',
      deadline: '2026-10-26'
    },
    {
      title: 'CCTV camera blind angle at Library rear bicycle stand',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'Medium',
      desc: 'The dome camera housing has shifted downward due to bird nesting, leaving the cycle parking zone unmonitored where recent theft was reported.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-28'
    },
    {
      title: 'Perimeter pathway high-mast floodlight dark near sports field',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'Medium',
      desc: 'The main walkway connecting the hostels to the library is completely dark after 7:30 PM. Female students have reported feeling unsafe.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-27'
    },
    {
      title: 'Dry chemical powder fire extinguisher past due for hydrostatic test',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'High',
      desc: 'Pressure gauge on the 5kg ABC extinguisher next to Lab 204 needle is dipping into the red recharge zone with an expired inspection tag.',
      status: 'In Progress',
      blockKeyword: 'Block C',
      deadline: '2026-10-26'
    },
    {
      title: 'Convex safety mirror cracked at blind driveway curve',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'Medium',
      desc: 'The large parabolic traffic mirror near the delivery gate is shattered. Shuttle drivers cannot see oncoming two-wheelers.',
      status: 'In Progress',
      blockKeyword: 'Common Area',
      deadline: '2026-10-29'
    },
    {
      title: 'Vehicular boom barrier arm not lowering properly at Gate 2',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'Low',
      desc: 'The automatic boom barrier gets stuck midway at a 45-degree angle, requiring manual pushing by security guard.',
      status: 'Pending',
      blockKeyword: 'Common Area',
      deadline: '2026-10-31'
    },
    {
      title: 'Fire hose reel cabinet glass cracked with sharp protruding edge',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'Low',
      desc: 'The red cabinet safety glass was struck by student backpack. Requires replacement before someone cuts their fingers.',
      status: 'Closed',
      blockKeyword: 'Block B',
      deadline: '2026-10-23'
    },
    {
      title: 'Keypad access control reader at Server Room door unresponsive',
      category: secDept.name,
      deptId: secDept._id,
      urgency: 'High',
      desc: 'RFID badge reader is beeping red error code. Authorized server engineers cannot enter without master physical key.',
      status: 'In Progress',
      blockKeyword: 'Block B',
      deadline: '2026-10-26'
    }
  ];

  // Helper to find location matching block
  function findLoc(blockKw) {
    const matched = locations.filter(l => l.block && l.block.toLowerCase().includes(blockKw.toLowerCase()));
    if (matched.length > 0) {
      return matched[Math.floor(Math.random() * matched.length)];
    }
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // 7. Insert all complaints
  let createdCount = 0;
  for (let i = 0; i < genuineComplaintsDataset.length; i++) {
    const item = genuineComplaintsDataset[i];
    const student = students[i % students.length];
    const loc = findLoc(item.blockKeyword);
    const locDesc = `${loc.campus || 'Main Campus'}, ${loc.block || 'Block A'}, ${loc.floor || 'Ground Floor'}${loc.room ? ', ' + loc.room : ''}`;

    // Get assigned worker for this department
    const deptWorkers = workersByDept[String(item.deptId)] || [];
    let assignedWorker = null;
    if (item.status === 'In Progress' || item.status === 'Closed' || item.status === 'Waiting Confirmation') {
      assignedWorker = deptWorkers[i % deptWorkers.length];
    }

    const complaintDoc = {
      title: item.title,
      category: item.category,
      location_id: loc._id,
      location_desc: locDesc,
      urgency: item.urgency,
      description: item.desc,
      user_id: student._id,
      user_name: student.name,
      status: item.status,
      upvote_count: Math.floor(Math.random() * 12) + 1,
      deadline: item.deadline,
      source: 'original',
      createdAt: new Date(Date.now() - (i * 3600000 * 4) - (Math.random() * 86400000)),
      updatedAt: new Date()
    };

    if (assignedWorker) {
      complaintDoc.assigned_to_id = assignedWorker._id;
      complaintDoc.assigned_to_name = assignedWorker.name;
    }

    await Complaint.create(complaintDoc);
    createdCount++;
  }

  const finalCount = await Complaint.countDocuments();
  console.log(`\n🎉 SUCCESS! Inserted ${createdCount} genuine complaints.`);
  console.log(`📊 Total complaints in database now: ${finalCount}`);
  process.exit(0);
}

seed50PlusComplaints().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
