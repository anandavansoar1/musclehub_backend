const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany(); // WARNING: Clears users. Maybe I shouldn't delete all users? 
        // The user asked to create AN admin account.
        // Let's change this to just create one if not exists.

        const adminExists = await User.findOne({ email: 'admin@musclehub.com' });

        if (adminExists) {
            console.log('Admin already exists!');
            process.exit();
        }

        const adminUser = new User({
            name: 'Admin User',
            email: 'admin',
            password: '1234', // Change this!
            role: 'admin',
            isAdmin: true,
        });

        await adminUser.save();

        console.log('Admin User Created!');
        console.log('Email: admin@musclehub.com');
        console.log('Password: adminpassword123');

        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
