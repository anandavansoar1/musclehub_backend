# SMS Integration Guide for MuscleHub

## Overview
The MuscleHub application includes functionality to send SMS reminders to members whose memberships are expiring soon. This guide explains how to integrate with popular SMS services.

## Current Implementation
The SMS reminder feature is currently implemented with a **mock SMS service** that logs messages to the console. To enable actual SMS sending, you need to integrate with an SMS service provider.

## Supported SMS Services

### 1. Twilio (Recommended for International)

#### Installation
```bash
npm install twilio
```

#### Configuration
Add to your `.env` file:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Implementation
Update `src/controllers/dashboardController.js`:

```javascript
// At the top of the file
const twilio = require('twilio');
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// In sendExpiryReminders function, replace the mock SMS section with:
await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: member.phone // Ensure phone numbers are in E.164 format (+919876543210)
});
```

### 2. MSG91 (Recommended for India)

#### Installation
```bash
npm install msg91-sms
```

#### Configuration
Add to your `.env` file:
```env
MSG91_AUTH_KEY=your_auth_key
MSG91_SENDER_ID=your_sender_id
MSG91_ROUTE=4
```

#### Implementation
Update `src/controllers/dashboardController.js`:

```javascript
// At the top of the file
const msg91 = require('msg91-sms');

// In sendExpiryReminders function:
const smsData = {
    authkey: process.env.MSG91_AUTH_KEY,
    mobiles: member.phone,
    message: message,
    sender: process.env.MSG91_SENDER_ID,
    route: process.env.MSG91_ROUTE
};

await msg91.send(smsData);
```

### 3. AWS SNS (Amazon Simple Notification Service)

#### Installation
```bash
npm install aws-sdk
```

#### Configuration
Add to your `.env` file:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

#### Implementation
Update `src/controllers/dashboardController.js`:

```javascript
// At the top of the file
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const sns = new AWS.SNS();

// In sendExpiryReminders function:
const params = {
    Message: message,
    PhoneNumber: member.phone,
    MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
        }
    }
};

await sns.publish(params).promise();
```

## Phone Number Format

### Important Notes:
- **Twilio & AWS SNS**: Require E.164 format (e.g., `+919876543210` for India)
- **MSG91**: Can work with 10-digit Indian numbers (e.g., `9876543210`)

### Formatting Helper Function
Add this utility function to ensure proper phone number formatting:

```javascript
// src/utils/phoneFormatter.js
const formatPhoneNumber = (phone, countryCode = '+91') => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If already has country code, return as is
    if (cleaned.length > 10) {
        return `+${cleaned}`;
    }
    
    // Add country code
    return `${countryCode}${cleaned}`;
};

module.exports = { formatPhoneNumber };
```

## Testing

### Test with Console Logs (Current Implementation)
The current implementation logs SMS messages to the console. Check your backend terminal to see the messages being "sent".

### Test with Real SMS Service
1. Set up a test account with your chosen SMS provider
2. Add credentials to `.env`
3. Update the controller code as shown above
4. Test with your own phone number first
5. Monitor the SMS service dashboard for delivery status

## Rate Limiting & Cost Considerations

### Best Practices:
1. **Batch Processing**: Send SMS in batches to avoid rate limits
2. **Confirmation**: Always show admin how many SMS will be sent before sending
3. **Error Handling**: Log failed SMS attempts for retry
4. **Cost Tracking**: Monitor SMS usage to control costs

### Example Rate Limiting:
```javascript
// Send SMS in batches of 10 with 1-second delay
const batchSize = 10;
for (let i = 0; i < expiringMembers.length; i += batchSize) {
    const batch = expiringMembers.slice(i, i + batchSize);
    await Promise.all(batch.map(member => sendSMS(member)));
    if (i + batchSize < expiringMembers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
```

## Message Templates

### Customize SMS Messages
Edit the message template in `dashboardController.js`:

```javascript
const message = `Hi ${member.fullName}, your membership at MuscleHub expires in ${daysRemaining} day(s) on ${endDate.toLocaleDateString('en-IN')}. Please renew to continue enjoying our services. Contact us for assistance.`;
```

### Template Variables Available:
- `member.fullName`: Member's full name
- `daysRemaining`: Days until expiry
- `endDate`: Membership end date
- `member.membershipType`: Plan type
- `member.phone`: Phone number

## Security Considerations

1. **Never commit `.env` file** to version control
2. **Use environment variables** for all sensitive credentials
3. **Validate phone numbers** before sending
4. **Implement rate limiting** to prevent abuse
5. **Log all SMS activities** for audit purposes

## Troubleshooting

### Common Issues:

1. **SMS not sending**
   - Check credentials in `.env`
   - Verify phone number format
   - Check SMS service account balance

2. **Invalid phone number**
   - Ensure proper E.164 format for international services
   - Validate phone numbers in Member model

3. **Rate limit exceeded**
   - Implement batch processing
   - Add delays between batches
   - Upgrade SMS service plan

## Next Steps

1. Choose an SMS service provider
2. Create an account and get credentials
3. Install the required npm package
4. Update `.env` with credentials
5. Modify `dashboardController.js` with the integration code
6. Test with your phone number
7. Deploy and monitor

## Support

For issues with specific SMS providers:
- **Twilio**: https://www.twilio.com/docs/sms
- **MSG91**: https://docs.msg91.com/
- **AWS SNS**: https://docs.aws.amazon.com/sns/

For MuscleHub-specific issues, check the application logs and ensure all dependencies are installed.
