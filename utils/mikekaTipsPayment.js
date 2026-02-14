const { default: axios } = require("axios");

const mikekaTipsPaymentWebhook = async (order_id, status, email, phone) => {
    try {
        const payload = {
            order_id, payment_status: status, email, phone, reference: order_id, SECRET: process.env.PASS_USER
        }
        const mtipsServer = "https://mikekatips.co.tz/api/payment-webhook"
        await axios.post(mtipsServer, payload)
    } catch (error) {
        console.error("MikekaTips Payment Webhook Error:", error?.message || error)
    }
}

const yaUhakikaTipsPaymentWebhook = async (order_id, status, email, phone) => {
    try {
        const payload = {
            order_id, payment_status: status, email, phone, reference: order_id, SECRET: process.env.PASS_USER
        }
        const yaUhakikaServer = "https://mikekayauhakika.com/api/payment-webhook"
        await axios.post(yaUhakikaServer, payload)
    } catch (error) {
        console.error("YaUhakika Payment Webhook Error:", error?.message || error)
    }
}

const waLeoPaymentWebhook = async (order_id, status, email, phone) => {
    try {
        const payload = {
            order_id, payment_status: status, email, phone, reference: order_id, SECRET: process.env.PASS_USER
        }
        const waLeoServer = "https://mkekawaleo.com/api/payment-webhook"
        await axios.post(waLeoServer, payload)
    } catch (error) {
        console.error("WaLeo Payment Webhook Error:", error?.message || error)
    }
}


module.exports = {
    mikekaTipsPaymentWebhook,
    yaUhakikaTipsPaymentWebhook,
    waLeoPaymentWebhook
};