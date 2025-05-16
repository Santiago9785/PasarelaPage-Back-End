const express = require('express');
const router = express.Router();
const { 
    createPayPalPayment,
    capturePayPalPayment,
    createWompiPayment,
    checkWompiPaymentStatus,
    handlePaymentWebhook 
} = require('../controllers/payment.controller');
const validateJWT = require('../middlewares/validateJWT');

// Rutas protegidas (requieren autenticación)
router.post('/paypal/:orderId', validateJWT, createPayPalPayment);
router.post('/paypal/capture/:orderId', validateJWT, capturePayPalPayment);
router.post('/wompi/:orderId', validateJWT, createWompiPayment);
router.get('/wompi/status/:reference', validateJWT, checkWompiPaymentStatus);

// Webhook (no requiere autenticación ya que es llamado por las pasarelas)
router.post('/webhook', handlePaymentWebhook);

module.exports = router; 