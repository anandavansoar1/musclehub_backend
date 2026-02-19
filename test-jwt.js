const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const secret = process.env.JWT_SECRET;
console.log(`Checking JWT_SECRET...`);

if (!secret) {
    console.error('❌ ERROR: JWT_SECRET is NOT defined in .env file');
    process.exit(1);
}

console.log(`✅ JWT_SECRET found: ${secret}`);

// Test Token Generation
const payload = { id: 'test_user_id' };
try {
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    console.log(`✅ Token Generated Successfully: ${token}`);

    // Test Token Verification
    const decoded = jwt.verify(token, secret);
    console.log(`✅ Token Verified Successfully. Decoded Payload:`, decoded);

    if (decoded.id === payload.id) {
        console.log('✅ JWT functionality is working perfectly!');
    } else {
        console.error('❌ Token payload mismatch!');
    }

} catch (error) {
    console.error(`❌ JWT Error: ${error.message}`);
}
