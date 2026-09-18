const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

// Helper to load ESM module @whiskeysockets/baileys in CommonJS
let baileysPkg = null;
const getBaileys = async () => {
    if (!baileysPkg) {
        baileysPkg = await import('@whiskeysockets/baileys');
    }
    return baileysPkg;
};

// Map of active WhatsApp sessions: gymId -> { sock, state, qr, pairingCode, phone, saveCreds }
const sessions = new Map();

const getSessionDir = (gymId) => {
    const baseDir = path.join(process.cwd(), 'wa_sessions');
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    const sessionDir = path.join(baseDir, `gym_${gymId}`);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
};

/**
 * Format Indian / International phone numbers to WhatsApp JID format
 */
const formatJid = (phone) => {
    let clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10) {
        clean = '91' + clean;
    }
    return `${clean}@s.whatsapp.net`;
};

/**
 * Clean phone number for pairing code request (digits only, e.g. 919876543210)
 */
const formatPhoneForPairing = (phone) => {
    let clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10) {
        clean = '91' + clean;
    }
    return clean;
};

/**
 * Initialize or retrieve WhatsApp session for a gym
 */
const getOrInitSession = async (gymId, phoneNumberForPairing = null) => {
    const gymIdStr = String(gymId);
    let session = sessions.get(gymIdStr);

    if (session && session.sock && session.state === 'open') {
        return session;
    }

    const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore,
    } = await getBaileys();

    const sessionDir = getSessionDir(gymIdStr);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['MuscleHub CRM', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
    });

    session = {
        sock,
        state: state.creds.registered ? 'connecting' : 'pending_auth',
        qr: null,
        qrDataUrl: null,
        pairingCode: null,
        phone: state.creds.me?.id?.split(':')[0] || null,
        saveCreds,
    };
    sessions.set(gymIdStr, session);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            session.qr = qr;
            session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 }).catch(() => null);
        }

        if (connection === 'open' || (sock.user && !qr)) {
            session.state = 'open';
            session.qr = null;
            session.qrDataUrl = null;
            session.pairingCode = null;
            session.phone = sock.user?.id ? sock.user.id.split(':')[0] : (sock.user?.name || 'Connected');
            console.log(`[WhatsApp] Gym ${gymIdStr} WhatsApp connected successfully as ${session.phone}`);
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[WhatsApp] Gym ${gymIdStr} connection closed. Status: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

            if (shouldReconnect) {
                session.state = 'reconnecting';
                setTimeout(() => {
                    getOrInitSession(gymIdStr).catch(() => {});
                }, 2000);
            } else {
                session.state = 'logged_out';
                session.phone = null;
                sessions.delete(gymIdStr);
                try {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                } catch (e) {}
            }
        }
    });

    // Request Pairing Code if requested and not yet registered
    if (phoneNumberForPairing && !state.creds.registered) {
        const cleanPhone = formatPhoneForPairing(phoneNumberForPairing);
        // Small delay to ensure socket handshake
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
            const code = await sock.requestPairingCode(cleanPhone);
            const formattedCode = code ? code.match(/.{1,4}/g)?.join('-') || code : code;
            session.pairingCode = formattedCode;
            session.state = 'pairing_code_ready';
            console.log(`[WhatsApp] Gym ${gymIdStr} Pairing Code generated: ${formattedCode}`);
        } catch (err) {
            console.error(`[WhatsApp] Error requesting pairing code for ${cleanPhone}:`, err.message);
            throw err;
        }
    }

    return session;
};

/**
 * Get current WhatsApp status for a gym
 */
const getWhatsAppStatus = async (gymId, autoInit = true) => {
    const gymIdStr = String(gymId);
    let session = sessions.get(gymIdStr);

    if (!session && autoInit) {
        session = await getOrInitSession(gymIdStr).catch(() => null);
    }

    if (!session) {
        return {
            connected: false,
            state: 'disconnected',
            phone: null,
            qr: null,
            qrDataUrl: null,
            hasQr: false,
        };
    }

    const isConnected = session.state === 'open' || (session.sock?.user && !session.qr);
    const phone = session.phone || (session.sock?.user?.id ? session.sock.user.id.split(':')[0] : null);

    return {
        connected: !!isConnected,
        state: session.state,
        phone,
        pairingCode: session.pairingCode || null,
        qr: session.qr || null,
        qrDataUrl: session.qrDataUrl || null,
        hasQr: !!session.qrDataUrl || !!session.qr,
    };
};

/**
 * Request an 8-digit Pairing Code for a phone number
 */
const requestPairingCode = async (gymId, phoneNumber) => {
    const gymIdStr = String(gymId);
    if (!phoneNumber) {
        throw new Error('Phone number is required');
    }
    const session = await getOrInitSession(gymIdStr, phoneNumber);
    return {
        pairingCode: session.pairingCode,
        state: session.state,
    };
};

/**
 * Get QR Code data URL for Web/App linking fallback
 */
const getQRCode = async (gymId) => {
    const gymIdStr = String(gymId);
    const session = await getOrInitSession(gymIdStr);

    // If QR is not ready yet and not registered, wait up to 10s for Baileys to emit QR
    if (!session.qrDataUrl && session.state !== 'open') {
        for (let i = 0; i < 25; i++) {
            if (session.qrDataUrl || session.state === 'open') break;
            await new Promise((r) => setTimeout(r, 400));
        }
    }

    return {
        qr: session.qr,
        qrDataUrl: session.qrDataUrl,
        state: session.state,
    };
};

/**
 * Send a single WhatsApp text message with validation and retry
 */
const sendWhatsAppMessage = async (gymId, toPhone, messageText) => {
    const gymIdStr = String(gymId);
    let session = sessions.get(gymIdStr);

    if (!session || session.state !== 'open' || !session.sock) {
        session = await getOrInitSession(gymIdStr);
        for (let i = 0; i < 10; i++) {
            if (session.state === 'open') break;
            await new Promise((r) => setTimeout(r, 300));
        }
    }

    if (!session || !session.sock) {
        throw new Error('WhatsApp is not connected for this gym. Please link WhatsApp first.');
    }

    let cleanPhone = String(toPhone).replace(/\D/g, '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    // Check if number exists on WhatsApp
    try {
        const onWa = await session.sock.onWhatsApp(jid);
        if (onWa && Array.isArray(onWa) && onWa.length > 0 && !onWa[0].exists) {
            throw new Error(`Number +${cleanPhone} is not registered on WhatsApp`);
        }
    } catch (e) {
        if (e.message && e.message.includes('not registered on WhatsApp')) {
            throw e;
        }
    }

    // Send with auto-retry
    try {
        const result = await session.sock.sendMessage(jid, { text: messageText });
        return result;
    } catch (err) {
        console.warn(`[WhatsApp] Send failed for ${cleanPhone}, retrying once:`, err.message);
        await new Promise((r) => setTimeout(r, 1500));
        const retrySession = sessions.get(gymIdStr) || (await getOrInitSession(gymIdStr));
        if (retrySession && retrySession.sock) {
            const result = await retrySession.sock.sendMessage(jid, { text: messageText });
            return result;
        }
        throw err;
    }
};

/**
 * Disconnect & Logout WhatsApp session
 */
const logoutWhatsApp = async (gymId) => {
    const gymIdStr = String(gymId);
    const session = sessions.get(gymIdStr);

    if (session && session.sock) {
        try {
            await session.sock.logout();
        } catch (e) {
            try { session.sock.end(); } catch (err) {}
        }
    }

    sessions.delete(gymIdStr);

    const sessionDir = getSessionDir(gymIdStr);
    try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}

    return { message: 'WhatsApp logged out successfully' };
};

module.exports = {
    getWhatsAppStatus,
    requestPairingCode,
    getQRCode,
    sendWhatsAppMessage,
    logoutWhatsApp,
};
