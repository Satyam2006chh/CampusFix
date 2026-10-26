require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// ─── Connect to MongoDB ───────────────────────────────────────
connectDB();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Serve Frontend Static Files ─────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/locations',   require('./routes/locationRoutes'));
app.use('/api/complaints',  require('./routes/complaintRoutes'));
app.use('/api/attendance',  require('./routes/attendanceRoutes'));
app.use('/api/leaves',      require('./routes/leaveRoutes'));
app.use('/api/payslips',    require('./routes/payslipRoutes'));
app.use('/api/ai',          require('./routes/aiRoutes'));

// ─── Health check & API Overview ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: '🎓 CampusFix API is running',
    version: '2.0.0',
    endpoints: [
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'POST   /api/auth/logout',
      'GET    /api/auth/me',
      'GET    /api/users',
      'POST   /api/users',
      'GET    /api/users/:id',
      'PATCH  /api/users/:id',
      'DELETE /api/users/:id',
      'GET    /api/departments',
      'POST   /api/departments',
      'GET    /api/departments/:id',
      'PATCH  /api/departments/:id',
      'DELETE /api/departments/:id',
      'GET    /api/locations',
      'POST   /api/locations',
      'GET    /api/locations/:id',
      'PATCH  /api/locations/:id',
      'DELETE /api/locations/:id',
      'GET    /api/complaints',
      'POST   /api/complaints',
      'GET    /api/complaints/:id',
      'PATCH  /api/complaints/:id',
      'DELETE /api/complaints/:id',
    ],
  });
});

// Explicit home and portal shortcuts
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: `API route ${req.originalUrl} not found` });
  }
  res.status(404).sendFile(path.join(frontendPath, 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CampusFix backend running on http://localhost:${PORT}`);
});
