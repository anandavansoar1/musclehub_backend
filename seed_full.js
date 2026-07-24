const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Gym = require('./src/models/Gym');
const Member = require('./src/models/Member');
const Payment = require('./src/models/Payment');
const connectDB = require('./src/config/db');

dotenv.config();

connectDB().then(async () => {
    try {
        const adminUser = await User.findOne({ email: 'admin' });
        if (!adminUser) {
            console.log("Admin user not found. Run seeder.js first.");
            process.exit(1);
        }

        let gym = await Gym.findOne({ owner: adminUser._id });
        if (!gym) {
            gym = await Gym.create({
                owner: adminUser._id,
                name: 'MuscleHub Elite',
                city: 'New York',
                status: 'active'
            });
            console.log("Gym created for Admin!");
        }

        await Member.deleteMany({ gymId: gym._id });
        await Payment.deleteMany({ gymId: gym._id });

        if (true) {
            const member1 = await Member.create({
                gymId: gym._id,
                fullName: 'Shivam',
                phone: '7814167295',
                membershipType: 'Pro Plan',
                price: 600,
                status: 'Active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30*24*60*60*1000)
            });
            const member2 = await Member.create({
                gymId: gym._id,
                fullName: 'Krishna',
                phone: '7408526588',
                membershipType: 'Basic Plan',
                price: 400,
                status: 'Active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30*24*60*60*1000)
            });

            await Payment.create({
                gymId: gym._id,
                member: member1._id,
                amount: 600,
                description: 'Initial Membership',
                type: 'Membership',
                status: 'Paid',
                date: new Date()
            });

            await Payment.create({
                gymId: gym._id,
                member: member2._id,
                amount: 400,
                description: 'Initial Membership',
                type: 'Membership',
                status: 'Paid',
                date: new Date()
            });
            console.log("Mock members and payments created!");
        } else {
            console.log("Members already exist for this gym.");
        }

        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});
