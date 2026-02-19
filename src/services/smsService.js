/**
 * smsService.js — Future-proof SMS abstraction layer
 *
 * HOW TO GO LIVE:
 *   1. Set SMS_PROVIDER in your .env to one of: '2factor' | 'twilio' | 'msg91'
 *   2. Set the corresponding API key / credentials in .env
 *   3. That's it — no other code changes needed.
 *
 * Supported providers:
 *   - 2Factor  : SMS_PROVIDER=2factor  + TWOFACTOR_API_KEY=<key>
 *   - Twilio   : SMS_PROVIDER=twilio   + TWILIO_SID + TWILIO_TOKEN + TWILIO_FROM
 *   - MSG91    : SMS_PROVIDER=msg91    + MSG91_AUTH_KEY + MSG91_SENDER_ID
 *   - console  : (default) logs to console — no real SMS sent
 */

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'console';

/**
 * Send an SMS message.
 * @param {string} to   - Phone number (10-digit Indian mobile, or E.164 for Twilio)
 * @param {string} body - Message text (max 160 chars recommended)
 * @returns {Promise<{ success: boolean, provider: string, info?: string }>}
 */
async function sendSms(to, body) {
    const phone = String(to).replace(/\D/g, ''); // strip non-digits

    switch (SMS_PROVIDER) {
        // ─── 2Factor ──────────────────────────────────────────────────────────
        case '2factor': {
            const apiKey = process.env.TWOFACTOR_API_KEY;
            if (!apiKey) throw new Error('TWOFACTOR_API_KEY not set in .env');

            const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/${encodeURIComponent(body)}/AUTOGEN`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.Status === 'Success') {
                return { success: true, provider: '2factor', info: data.Details };
            }
            throw new Error(`2Factor error: ${data.Details}`);
        }

        // ─── Twilio ───────────────────────────────────────────────────────────
        case 'twilio': {
            const accountSid = process.env.TWILIO_SID;
            const authToken = process.env.TWILIO_TOKEN;
            const from = process.env.TWILIO_FROM;
            if (!accountSid || !authToken || !from) throw new Error('Twilio env vars not set');

            const e164 = phone.length === 10 ? `+91${phone}` : `+${phone}`;
            const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

            const res = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({ To: e164, From: from, Body: body }).toString(),
                }
            );
            const data = await res.json();
            if (data.sid) return { success: true, provider: 'twilio', info: data.sid };
            throw new Error(`Twilio error: ${data.message}`);
        }

        // ─── MSG91 ────────────────────────────────────────────────────────────
        case 'msg91': {
            const authKey = process.env.MSG91_AUTH_KEY;
            const senderId = process.env.MSG91_SENDER_ID || 'GYMHUB';
            if (!authKey) throw new Error('MSG91_AUTH_KEY not set in .env');

            const res = await fetch('https://api.msg91.com/api/v5/flow/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authkey: authKey,
                },
                body: JSON.stringify({
                    template_id: process.env.MSG91_TEMPLATE_ID || '',
                    sender: senderId,
                    short_url: '0',
                    mobiles: `91${phone}`,
                    VAR1: body, // adjust to your template variables
                }),
            });
            const data = await res.json();
            if (data.type === 'success') return { success: true, provider: 'msg91', info: data.message };
            throw new Error(`MSG91 error: ${JSON.stringify(data)}`);
        }

        // ─── Console (default / dev) ──────────────────────────────────────────
        default: {
            console.log(`\n📱 [SMS — console mode]\n   To: ${phone}\n   Message: ${body}\n`);
            return { success: true, provider: 'console', info: 'Logged to console (no real SMS sent)' };
        }
    }
}

module.exports = { sendSms };
