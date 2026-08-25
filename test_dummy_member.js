const mongoose = require('mongoose');
const Member = require('./src/models/Member');
const Coach = require('./src/models/Coach');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const coach = await Coach.findOne({ phone: '9876543210' });
    if (coach) {
        await Member.create({
            gymId: coach.gymId,
            fullName: 'Dummy Member',
            phone: '1112223333',
            membershipType: 'Gold',
            planDuration: '6 Months',
            price: 5000,
            endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            status: 'Active',
            trainer: coach.name,
            gender: 'Male'
        });
        console.log("Created dummy member assigned to coach!");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
