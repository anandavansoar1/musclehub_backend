const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Duration = require('../models/Duration');
const connectDB = require('../config/db');

dotenv.config();

const seedDurations = async () => {
    await connectDB();

    const durations = [
        { label: '1 Month', value: 1 },
        { label: '3 Months', value: 3 },
        { label: '6 Months', value: 6 }
    ];

    try {
        await Duration.deleteMany();
        await Duration.insertMany(durations);
        console.log('Durations seeded!');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedDurations();
