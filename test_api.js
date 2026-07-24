const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const generateToken = require('./src/utils/generateToken');

async function testApi() {
    try {
        await connectDB();
        const user = await User.findOne({ email: 'admin' });
        const token = generateToken(user._id);
        console.log("Token fetched:", !!token);

        // Get all gyms
        const gymsRes = await fetch('http://127.0.0.1:5001/api/gym/all', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Gyms Status:", gymsRes.status);
        const gymsText = await gymsRes.text();
        console.log("Gyms Body:", gymsText);
    } catch (e) {
        console.error("API Error:", e);
    }
}

testApi();
