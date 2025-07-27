const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userEmail: {
        type: String,
        required: true,
    },
    paymentId: {
        type: String,
        required: true,
    },
    orderReference: {
        type: String,
        required: true,
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ["PROCESSING", "PENDING", "SUCCESS", "FAILED", "CONFIRMED"]
    }
},
    {timestamps: true}
);

module.exports = mongoose.model('PaymentBin', paymentSchema);