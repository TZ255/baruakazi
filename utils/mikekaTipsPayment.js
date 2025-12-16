const { default: axios } = require("axios");

const mikekaTipsPaymentWebhook = async (order_id, status, email) => {
    try {
        const payload = {
            order_id, payment_status: status, email, reference: order_id, SECRET: process.env.PASS_USER
        }
        const mtipsServer = "https://mikekatips.fly.dev/api/payment-webhook"
        await axios.post(mtipsServer, payload)
    } catch (error) {
        console.error("MikekaTips Payment Webhook Error:", error?.message || error)
    }
}

const yaUhakikaTipsPaymentWebhook = async (order_id, status, email) => {
    try {
        const payload = {
            order_id, payment_status: status, email, reference: order_id, SECRET: process.env.PASS_USER
        }
        const yaUhakikaServer = "https://yauhakika.up.railway.app/api/payment-webhook"
        await axios.post(yaUhakikaServer, payload)
    } catch (error) {
        console.error("YaUhakika Payment Webhook Error:", error?.message || error)
    }
}


module.exports = {
    mikekaTipsPaymentWebhook,
    yaUhakikaTipsPaymentWebhook
};