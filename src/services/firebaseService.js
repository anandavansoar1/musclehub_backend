const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// You need to download the service account key from Firebase Console -> Project Settings -> Service Accounts
// and save it as "service-account.json" in the backend root directory (or src/config)
const serviceAccountPath = path.join(__dirname, '../../service-account.json');

let firebaseInitialized = false;

try {
    // Check if the service account file exists before trying to initialize
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        console.log('Firebase Admin Initialized successfully');
    } else {
        console.log('Firebase Service Account file not found. Push notifications will be disabled.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
}

/**
 * Send a clean push notification to a specific device token
 * @param {string} token - The user's FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
const sendPushNotification = async (token, title, body, data = {}) => {
    if (!firebaseInitialized || !token) return;

    const message = {
        token: token,
        notification: {
            title: title,
            body: body
        },
        data: {
            ...data, // Ensure all data values are strings
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        return null;
    }
};

/**
 * Send a notification to multiple tokens (multicast)
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {string} title 
 * @param {string} body 
 * @param {object} data 
 */
const sendMulticastNotification = async (tokens, title, body, data = {}) => {
    if (!firebaseInitialized || !tokens || tokens.length === 0) return;

    const message = {
        tokens: tokens,
        notification: {
            title: title,
            body: body
        },
        data: {
            ...data // Ensure all data values are strings
        }
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(response.successCount + ' messages were sent successfully');
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
        }
    } catch (error) {
        console.error('Error sending multicast message:', error);
    }
};

module.exports = {
    sendPushNotification,
    sendMulticastNotification
};
