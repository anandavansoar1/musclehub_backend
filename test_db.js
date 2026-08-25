const mongoose = require('mongoose');
const User = require('./src/models/User');
const Coach = require('./src/models/Coach');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const coach = await Coach.findOne({ phone: '9876543210' });
    if (coach) {
        await User.create({
            name: coach.name,
            email: '9876543210@gym.com',
            phone: coach.phone,
            password: '123', // I'm just setting a temporary default password
            role: 'coach',
            isAdmin: false,
            premiumFeatureAccess: false,
            gymId: coach.gymId,
            linkedCoachId: coach._id
        });
        console.log("Created user for coach!");
    } else {
        console.log("Coach not found!");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
