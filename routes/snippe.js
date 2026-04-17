const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const { isValidPhoneNumber, getPhoneNumberDetails } = require('tanzanian-phone-validator');
const { initiateClickPesaUSSDPush, checkPaymentStatus, generateCheckOutLink } = require('../utils/clickPesaAPI');
const PaymentBin = require('../models/PaymentBin');
const { ensureAdmin } = require('../middleware/admin');
const MTipsUsersModel = require('../models/MTipsUsers');
const { mikekaTipsPaymentWebhook, yaUhakikaTipsPaymentWebhook, waLeoPaymentWebhook } = require('../utils/mikekaTipsPayment');
const { default: axios } = require('axios');
const { sendTelegramNotification } = require('../utils/sendTelegramNotification');

const router = express.Router();

//webhook example response from snippe

/* 
{
"id": "evt_4e3a6a40250368c1bf45b28e",
"type": "payment.completed",
"api_version": "2026-01-25",
"created_at": "2026-03-04T08:41:16Z",
"data": {
"reference": "95e426ec-c2c9-4354-a4b9-d33be4de9f86",
"external_reference": "S20443561123",
"status": "completed",
"amount": {
  "value": 500,
  "currency": "TZS"
},
"settlement": {
  "gross": {
    "value": 500,
    "currency": "TZS"
  },
  "fees": {
    "value": 2,
    "currency": "TZS"
  },
  "net": {
    "value": 498,
    "currency": "TZS"
  }
},
"channel": {
  "type": "mobile_money",
  "provider": "mpesa"
},
"customer": {
  "phone": "+255754920480",
  "name": "JanjaTZ Blog JanjaTZ Blog",
  "email": "67abaeab35ae53db4f316048@tanzabyte.com"
},
"metadata": {
  "order_id": "WALEOmmbse8d3"
},
"completed_at": "2026-03-04T08:41:14.249226Z"
}
}
*/



router.post('/payment/webhook/snippe/:server', async (req, res) => {
    console.log('SNIPPE WEBHOOK received:', req.body);

    const server = req.params.server;

    // Validate before acknowledging (or ack immediately and process async)
    if (!['mtips', 'uhakika', 'waleo'].includes(server)) {
        console.error('Invalid server in webhook URL:', server);
        return res.status(400).json({ success: false, message: 'Invalid server' });
    }

    const { id, type, data: { status, customer: { email, phone } = {}, metadata: { order_id } = {} } = {} } = req.body || {};

    if (!id || !type || !status || !email || !phone || !order_id) {
        console.error('Missing required fields in webhook payload:', req.body);
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (type !== 'payment.completed' || status !== 'completed') {
        // Not an error — just an event we don't care about, ack it silently
        return res.status(200).json({ success: true, message: 'Event ignored' });
    }

    // ACK immediately, then forward async
    res.status(200).json({ success: true, message: 'Webhook received' });

    const forwardTo = {
        waleo: "https://mkekawaleo.com/webhook/snippe",
        uhakika: "https://mikekayauhakika.com/webhook/snippe",
        mtips: "https://mikekatips.co.tz/webhook/snippe",
    };

    try {
        await axios.post(forwardTo[server], req.body, {
            headers: {
                "x-webhook-secret": process.env.PASS_USER,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    } catch (error) {
        console.error('Webhook Forwarding error:', error);
        sendTelegramNotification(`Webhook Forwarding error for ${server}: ${error?.message}`, false);
    }
});

module.exports = router;