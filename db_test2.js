const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const User = require('./src/models/User');
    const Member = require('./src/models/Member');
    const users = await User.find({});
    const members = await Member.find({});
    console.log("USERS:");
    users.forEach(u => console.log(u.email, u.role, u._id, u.gymId));
    console.log("MEMBERS:");
    members.forEach(m => console.log(m.email, m.userId, m.gymId));
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
