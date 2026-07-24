const dotenv = require('dotenv');
dotenv.config();

const Gym = require('./src/models/Gym');
const Member = require('./src/models/Member');
const connectDB = require('./src/config/db');

connectDB().then(async () => {
    const gyms = await Gym.find({});
    console.log("Gyms count:", gyms.length);
    for (let gym of gyms) {
        const members = await Member.countDocuments({ gymId: gym._id });
        console.log(`- ${gym.name} (ID: ${gym._id}) -> Members: ${members}`);
    }
    
    const allMembers = await Member.countDocuments({});
    console.log("Total members in DB:", allMembers);
    process.exit(0);
}).catch(console.error);
