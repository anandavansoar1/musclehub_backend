const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Inventory = require('./src/models/Inventory');
    const items = await Inventory.find({});
    console.log("INVENTORY ITEMS:");
    items.forEach(i => console.log(i.name, i.category, i.gymId));
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
