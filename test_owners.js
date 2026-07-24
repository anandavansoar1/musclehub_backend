const mongoose = require('mongoose');
const Gym = require('./src/models/Gym');
const User = require('./src/models/User');

const MONGO_URI = 'mongodb+srv://developeranand001:Anand555@cluster0.aeky2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // using standard connection string, but maybe I can check the .env file

require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || MONGO_URI);
        console.log('Connected to MongoDB');

        const gyms = await Gym.find({}).lean();
        console.log(`Found ${gyms.length} gyms`);

        for (const gym of gyms) {
            let user = null;
            if (gym.owner) {
                user = await User.findById(gym.owner).lean();
            }
            console.log(`Gym: ${gym.name} | OwnerID in Gym doc: ${gym.owner} | User in DB: ${user ? user.email + ' / ' + user.name : 'NULL (Deleted)'}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

run();
