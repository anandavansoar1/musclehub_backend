const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const {
    getWhatsAppStatus,
    requestPairingCode,
    getQRCode,
    sendWhatsAppMessage,
    logoutWhatsApp,
} = require('../services/whatsappService');

const User = require('../models/User');

// Helper to get gymId for admin
const getGymIdForAdmin = async (userId) => {
    let gym = await Gym.findOne({ owner: userId });
    if (!gym) {
        const user = await User.findById(userId);
        if (user && user.gymId) {
            gym = await Gym.findById(user.gymId);
        }
        if (!gym && user) {
            gym = await Gym.create({
                owner: userId,
                name: user.name ? `${user.name}'s Gym` : 'MuscleHub Gym',
            });
        }
    }
    return gym ? gym._id : null;
};

// Sleep helper with random jitter
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// @desc    Get WhatsApp connection status for gym
// @route   GET /api/whatsapp/status
// @access  Private/Admin
const getStatus = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) {
        res.status(404);
        throw new Error('Gym not found for this admin');
    }

    const status = await getWhatsAppStatus(gymId);
    res.json(status);
});

// @desc    Request 8-digit WhatsApp Pairing Code
// @route   POST /api/whatsapp/pairing-code
// @access  Private/Admin
const getPairingCode = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) {
        res.status(404);
        throw new Error('Gym not found');
    }

    const { phoneNumber } = req.body;
    if (!phoneNumber) {
        res.status(400);
        throw new Error('Phone number is required');
    }

    const result = await requestPairingCode(gymId, phoneNumber);
    res.json(result);
});

// @desc    Get QR Code data URL (fallback)
// @route   GET /api/whatsapp/qr
// @access  Private/Admin
const getQR = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) {
        res.status(404);
        throw new Error('Gym not found');
    }

    const qrResult = await getQRCode(gymId);
    res.json(qrResult);
});

// @desc    Logout / Disconnect WhatsApp
// @route   POST /api/whatsapp/logout
// @access  Private/Admin
const logout = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) {
        res.status(404);
        throw new Error('Gym not found');
    }

    const result = await logoutWhatsApp(gymId);
    res.json(result);
});

// @desc    Broadcast WhatsApp expiry reminders with anti-ban delay (4-7s)
// @route   POST /api/whatsapp/broadcast-reminders
// @access  Private/Admin
const broadcastReminders = asyncHandler(async (req, res) => {
    const gym = await Gym.findOne({ owner: req.user._id });
    if (!gym) {
        res.status(404);
        throw new Error('Gym not found');
    }
    const gymId = gym._id;
    const gymName = gym.name || 'MuscleHub Gym';

    // Verify WhatsApp is connected (with reconnect grace period)
    let waStatus = await getWhatsAppStatus(gymId);
    if (!waStatus.connected) {
        for (let i = 0; i < 8; i++) {
            await sleep(500);
            waStatus = await getWhatsAppStatus(gymId);
            if (waStatus.connected) break;
        }
    }

    if (!waStatus.connected) {
        res.status(400);
        throw new Error('WhatsApp is not connected. Please tap "Link WhatsApp" and scan the barcode first.');
    }

    const { threshold, memberIds, customTemplate } = req.body;

    let targetMembers = [];

    if (Array.isArray(memberIds) && memberIds.length > 0) {
        targetMembers = await Member.find({ _id: { $in: memberIds }, gymId });
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allMembers = await Member.find({ gymId, status: { $in: ['Active', 'Expired'] }, endDate: { $exists: true } });

        targetMembers = allMembers.filter((m) => {
            const end = new Date(m.endDate);
            end.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));

            if (threshold === -1 || threshold === 'expired') {
                return diffDays < 0;
            } else if (threshold !== undefined && threshold !== null) {
                const th = Number(threshold);
                return diffDays >= 0 && diffDays <= th;
            }
            return true;
        });
    }

    if (targetMembers.length === 0) {
        return res.json({
            success: true,
            total: 0,
            sentCount: 0,
            failedCount: 0,
            message: 'No members found matching the criteria.',
            results: [],
        });
    }

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < targetMembers.length; i++) {
        const member = targetMembers[i];
        const phone = member.phone;

        if (!phone) {
            failedCount++;
            results.push({ name: member.fullName, phone: 'N/A', status: 'failed', error: 'No phone number' });
            continue;
        }

        const endDateFormatted = member.endDate ? new Date(member.endDate).toLocaleDateString('en-IN') : 'N/A';
        const planName = member.membershipType || member.planDuration || 'Gym Membership';

        // Calculate days remaining or expired
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(member.endDate || Date.now());
        end.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));

        let expiryContext = '';
        if (diffDays < 0) {
            expiryContext = `expired ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago (${endDateFormatted})`;
        } else if (diffDays === 0) {
            expiryContext = `expiring TODAY (${endDateFormatted})`;
        } else {
            expiryContext = `expiring in ${diffDays} day${diffDays > 1 ? 's' : ''} (${endDateFormatted})`;
        }

        let message = customTemplate
            ? customTemplate
                .replace(/{name}/g, member.fullName.split(' ')[0])
                .replace(/{fullName}/g, member.fullName)
                .replace(/{gym}/g, gymName)
                .replace(/{plan}/g, planName)
                .replace(/{expiry}/g, endDateFormatted)
                .replace(/{days}/g, String(Math.abs(diffDays)))
            : `Hello ${member.fullName.split(' ')[0]}! 💪\n\nThis is a friendly reminder from *${gymName}* that your membership plan (*${planName}*) is ${expiryContext}.\n\nPlease renew your membership to continue your fitness training without interruption.\n\nThank you,\n*${gymName}*`;

        try {
            await sendWhatsAppMessage(gymId, phone, message);
            sentCount++;
            results.push({ name: member.fullName, phone, status: 'sent' });
            console.log(`[WhatsApp Broadcast] Sent reminder to ${member.fullName} (${phone}) [${i + 1}/${targetMembers.length}]`);
        } catch (err) {
            failedCount++;
            results.push({ name: member.fullName, phone, status: 'failed', error: err.message });
            console.error(`[WhatsApp Broadcast] Failed for ${member.fullName} (${phone}):`, err.message);
        }

        // Random delay between 4.0s and 7.0s to avoid spam flags (except after last member)
        if (i < targetMembers.length - 1) {
            const randomDelay = Math.floor(Math.random() * 3000) + 4000;
            await sleep(randomDelay);
        }
    }

    res.json({
        success: true,
        total: targetMembers.length,
        sentCount,
        failedCount,
        message: `Broadcast completed: ${sentCount} sent, ${failedCount} failed.`,
        results,
    });
});

module.exports = {
    getStatus,
    getPairingCode,
    getQR,
    logout,
    broadcastReminders,
};
