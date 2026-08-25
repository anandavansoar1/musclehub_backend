const mongoose = require('mongoose');
const Member = require('./src/models/Member');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const members = await Member.find({ trainer: 'Rnet singh' });
    console.log("Assigned Members:", members.length);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
