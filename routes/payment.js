const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const { isValidPhoneNumber, getPhoneNumberDetails } = require('tanzanian-phone-validator');
const { initiateClickPesaUSSDPush, checkPaymentStatus, generateCheckOutLink } = require('../utils/clickPesaAPI');
const PaymentBin = require('../models/PaymentBin');
const { ensureAdmin } = require('../middleware/admin');

const router = express.Router();

// GET /payment - Show payment page
router.get('/payment', ensureAuthenticated, (req, res) => {

    const site = {
        title: 'Malipo - BARUA KAZI',
        description: 'Nunua credits za kutengeneza barua za kazi'
    }
    res.render('payment', {
        site
    });
});

// POST /payment/process - Process payment request
router.post('/payment/process', ensureAuthenticated, async (req, res) => {
    try {
        const { phoneNumber, amount } = req.body;
        const fixedAmt = 4999

        // Validate phone number format (+255XXXXXXXXX)
        if (!phoneNumber || !/^\+255\d{9}$/.test(phoneNumber)) {
            return res.status(400).json({
                error: 'Namba ya simu si sahihi. Weka namba ya simu bila kuanza na 0'
            });
        }

        // check if phone number is available and is not voda
        const isTZPhoneNumber = isValidPhoneNumber(phoneNumber);
        if (!isTZPhoneNumber) {
            return res.status(400).json({
                error: 'Namba ya simu si sahihi. Weka namba sahihi bila kuanza na 0. Mfano: 7123456789'
            });
        }

        const phoneNumberDetails = getPhoneNumberDetails(phoneNumber);
        if (phoneNumberDetails.telecomCompanyDetails.brand.toLowerCase() === 'vodacom') {
            return res.status(400).json({
                error: 'Samahani! Malipo kwa Vodacom hayaruhusiwi kwa sasa. Tumia Tigo, Airtel au Halotel.'
            });
        }

        // Validate amount
        if (!amount || amount !== 4999) {
            return res.status(400).json({
                error: 'Kiasi cha malipo si sahihi'
            });
        }

        // Get user from session
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'Mtumiaji hakupatikana' });
        }

        // TODO: Integrate with mobile money payment gateway

        // For now, we'll simulate a successful payment request
        console.log('Payment request received:', {
            userId: user._id,
            userEmail: user.email,
            phoneNumber,
            amount
        });

        // Send payment request to mobile money API (M-Pesa, Tigo Pesa, etc.)
        const orderRef = `ORDER${Date.now()}PHONE${phoneNumber.replace('+', '')}`;

        let paymentUSSDResponse;
        try {
            paymentUSSDResponse = await initiateClickPesaUSSDPush(fixedAmt, 'TZS', orderRef, phoneNumber.replace('+', ''));
            console.log('Payment USSD response:', paymentUSSDResponse);
        } catch (apiError) {
            console.error('ClickPesa API error:', apiError);
            return res.status(500).json({
                error: 'Tumeshindwa kutuma ombi la malipo. Tafadhali hakikisha namba ya simu na ujaribu tena.'
            });
        }

        // Store payment request in database with pending status
        try {
            await PaymentBin.create({
                userId: user._id,
                userEmail: user.email,
                paymentId: paymentUSSDResponse?.id || orderRef,
                orderReference: paymentUSSDResponse?.orderReference || orderRef,
                paymentStatus: paymentUSSDResponse?.status || 'PROCESSING'
            });
        } catch (dbError) {
            console.error('Database error while creating payment record:', dbError);
            return res.status(500).json({
                error: 'Tumeshindwa kuhifadhi ombi la malipo. Tafadhali jaribu tena.'
            });
        }

        res.json({
            success: true,
            message: 'Ombi la malipo limetumwa kikamilifu. Fuata maagizo kwenye simu yako kufanya malipo.',
            paymentId: paymentUSSDResponse?.orderReference || orderRef,
        });

    } catch (error) {
        console.error('Payment processing error:', error.message);
        res.status(500).json({
            error: error.message || 'Tumeshindwa anzisha malipo. Tafadhali jaribu tena baadaye.'
        });
    }
});

// POST /payment/webhook - Handle payment webhook (for payment gateway callbacks)
router.post('/payment/webhook', async (req, res) => {
    try {
        const { event, data: { id, status, channel, orderReference, message, customer: { customerName, customerPhoneNumber } } } = req.body;

        res.status(200).json({ message: 'Webhook received successfully' });
        console.log('Payment webhook received:', req.body);

        if (status.toLowerCase() === 'success') {
            let pymnt = await PaymentBin.findOne({ orderReference, paymentStatus: "PROCESSING" })
            if (!pymnt) return console.log(`${orderReference} order not found`);

            let user = await User.findOne({ email: pymnt.userEmail })
            if (!user) return console.log(`User to confirm ${orderReference} not found`);

            const now = new Date();
            now.setMonth(now.getMonth() + 1);
            user.paidUntil = now;
            user.hasPaid = true
            user.generateLimit = (user.generateLimit || 0) + 15;
            user.paymentHistory.unshift({ amount: 4999, date: new Date() })
            await user.save()
            pymnt.paymentStatus = 'CONFIRMED'
            await pymnt.save()
            console.log('Order confirmed by webhook')
        }

        if (status.toLowerCase() === 'failed') {
            //update paymet to failed
            await PaymentBin.findOneAndUpdate({ orderReference }, { $set: { paymentStatus: 'FAILED' } })
        }

        // Send confirmation email/SMS
    } catch (error) {
        console.error('Webhook processing error:', error);
    }
});

// POST /payment/confirm - Payment status checking endpoint
router.post('/payment/confirm', ensureAuthenticated, async (req, res) => {
    try {
        const { orderReference } = req.body;

        if (!orderReference) {
            return res.status(400).json({
                status: 'error',
                message: 'OrderReference is required'
            });
        }

        // Check payment status in database
        const payment = await PaymentBin.findOne({ orderReference });

        if (!payment) {
            return res.status(404).json({
                status: 'error',
                message: 'Payment not found'
            });
        }

        // Map payment statuses to client-expected values
        let clientStatus = 'processing'; // default

        switch (payment.paymentStatus.toLowerCase()) {
            case 'confirmed':
                clientStatus = 'success';
                break;
            case 'failed':
                clientStatus = 'failed';
                break;
            case 'processing':
            case 'pending':
            default:
                clientStatus = 'processing';
                break;
        }

        res.json({
            status: clientStatus,
            paymentStatus: payment.paymentStatus,
            orderReference: payment.orderReference
        });

    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// router.get('/payment/test', ensureAdmin, async (req, res) => {
//     try {
//         let user = await User.findById(req.session.userId)
//         if(!user) res.json({message: 'User Not Found'});
//         const orderReference = `ORDER${Date.now()}`
//         let link = await generateCheckOutLink('255686784662', user.email, user.name, orderReference, 500)
//         res.redirect(link)
//     } catch (error) {
//         console.log(error.message)
//         req.flash(error.message)
//         res.redirect('/payment')
//     }
// })

module.exports = router;