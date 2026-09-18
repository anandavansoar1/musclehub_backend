const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const equipmentRoutes = require('./src/routes/equipmentRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const planAssignmentRoutes = require('./src/routes/planAssignmentRoutes');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Real-time Request Logger
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/plans', planAssignmentRoutes);
app.use('/api/gym', require('./src/routes/gymRoutes'));
app.use('/api/attendance', require('./src/routes/attendanceRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/inventory', require('./src/routes/inventoryRoutes'));
app.use('/api/equipment', require('./src/routes/equipmentRoutes'));
app.use('/api/plans', require('./src/routes/planRoutes'));
app.use('/api/durations', require('./src/routes/durationRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/classes', require('./src/routes/workoutClassRoutes'));
app.use('/api/coaches', require('./src/routes/coachRoutes'));
app.use('/api/community', require('./src/routes/communityRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));
app.use('/api/app', require('./src/routes/appRoutes'));
app.use('/api/upload', require('./src/routes/uploadRoutes'));
app.use('/api/whatsapp', require('./src/routes/whatsappRoutes'));
app.use('/api/platform-payments', require('./src/routes/platformPaymentRoutes'));
app.use('/api/platform-settings', require('./src/routes/platformSettingsRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// JSON Error Handler Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message || 'Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

const processAutoCheckouts = require('./src/utils/autoCheckout');
const checkGymSubscriptions = require('./src/utils/gymSubscriptionScheduler');

const { migratePayments } = require('./src/controllers/paymentController');

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

    // Run auto-checkout check every 15 minutes
    setInterval(processAutoCheckouts, 15 * 60 * 1000);
    // Run once on startup to catch any missed while server was down
    processAutoCheckouts();

    // Run gym subscription reminder check every 6 hours & once on startup
    setInterval(checkGymSubscriptions, 6 * 60 * 60 * 1000);
    checkGymSubscriptions();

    // Run payment migration once on startup to fix missing transactions
    migratePayments();
});
