const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const memberRoutes = require('./src/routes/memberRoutes');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/gym', require('./src/routes/gymRoutes'));
app.use('/api/attendance', require('./src/routes/attendanceRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/inventory', require('./src/routes/inventoryRoutes'));
app.use('/api/equipment', require('./src/routes/equipmentRoutes'));
app.use('/api/plans', require('./src/routes/planRoutes'));
app.use('/api/durations', require('./src/routes/durationRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/classes', require('./src/routes/workoutClassRoutes'));
app.use('/api/community', require('./src/routes/communityRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

const processAutoCheckouts = require('./src/utils/autoCheckout');

const { migratePayments } = require('./src/controllers/paymentController');

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

    // Run auto-checkout check every 15 minutes
    setInterval(processAutoCheckouts, 15 * 60 * 1000);
    // Run once on startup to catch any missed while server was down
    processAutoCheckouts();

    // Run payment migration once on startup to fix missing transactions
    migratePayments();
});
