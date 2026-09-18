const Gym = require('../models/Gym');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification } = require('../services/firebaseService');

/**
 * Checks all gym subscriptions and sends in-app notifications & push alerts
 * to gym owners when their subscription is expiring in <= 2 days or expired.
 */
const checkGymSubscriptions = async () => {
    try {
        const gyms = await Gym.find({ isActive: true }).populate('owner');
        const now = new Date();

        for (const gym of gyms) {
            if (!gym.subscriptionEndDate) continue;

            const endDate = new Date(gym.subscriptionEndDate);
            const diffMs = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            // Only trigger notifications if expiring within 2 days or already expired
            if (diffDays <= 2) {
                // Check if an alert was already sent in the last 24 hours to prevent duplicate spam
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentNotif = await Notification.findOne({
                    gymId: gym._id,
                    type: 'Alert',
                    title: { $regex: /subscription/i },
                    createdAt: { $gte: oneDayAgo }
                });

                if (recentNotif) {
                    continue; // Skip if already alerted within last 24 hours
                }

                let title = '';
                let message = '';
                const formattedDate = endDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                if (diffDays > 0) {
                    title = `⚠️ Gym Subscription Expiring in ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                    message = `Your MuscleHub subscription for ${gym.name} will expire on ${formattedDate}. Please renew your plan now to avoid service interruption.`;
                } else if (diffDays === 0) {
                    title = `🚨 Gym Subscription Expiring Today!`;
                    message = `Your MuscleHub subscription for ${gym.name} expires today (${formattedDate}). Please renew immediately to keep features active.`;
                } else {
                    title = `⛔ Gym Subscription Expired`;
                    message = `Your MuscleHub subscription for ${gym.name} has expired on ${formattedDate}. Please renew to regain full access.`;
                }

                // 1. Create In-App Notification document
                const newNotification = await Notification.create({
                    gymId: gym._id,
                    title,
                    message,
                    type: 'Alert',
                    targetAudience: 'All',
                    targetUserId: gym.owner ? gym.owner._id : null,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // kept for 7 days
                });

                console.log(`[Subscription Reminder] In-app notification created for gym "${gym.name}" (diffDays: ${diffDays})`);

                // 2. Send Push Notification if FCM token exists
                if (gym.owner && gym.owner.fcmToken) {
                    try {
                        await sendPushNotification(
                            gym.owner.fcmToken,
                            title,
                            message,
                            {
                                type: 'SUBSCRIPTION_EXPIRY',
                                gymId: gym._id.toString(),
                                notificationId: newNotification._id.toString()
                            }
                        );
                    } catch (pushErr) {
                        console.error(`[Subscription Reminder] Push notification failed for gym "${gym.name}":`, pushErr.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Subscription Reminder] Error checking gym subscriptions:', error);
    }
};

module.exports = checkGymSubscriptions;
