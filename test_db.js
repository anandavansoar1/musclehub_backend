const mongoose = require('mongoose');
const Gym = require('./src/models/Gym');
require('dotenv').config();

async function checkDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/musclehub');
        console.log('Connected to DB');
        const gyms = await Gym.find({});
        console.log(`Found ${gyms.length} gyms in database.`);
        if (gyms.length > 0) {
            console.log('Sample gym:', gyms[0].name);
        }
    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        mongoose.connection.close();
    }
}
checkDB();
