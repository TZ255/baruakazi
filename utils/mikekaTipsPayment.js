const MTipsUsersModel = require("../models/MTipsUsers");

const mikekaTipsPaymentWebhook = async (orderReference, userEmail) => {
    try {
        let user = await MTipsUsersModel.findOne({ email: userEmail })
        if (!user) return console.log(`User to confirm ${orderReference} not found`);

        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + 1);
        user.isPaid = true
        user.paidAt = new Date()
        user.expiresAt = expDate
        await user.save()
        pymnt.paymentStatus = 'CONFIRMED'
        await pymnt.save()
        return console.log('MikekaTips Order confirmed by webhook')
    } catch (error) {
        //
    }
}


module.exports = {
    mikekaTipsPaymentWebhook
};