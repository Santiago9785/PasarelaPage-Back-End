const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getOrderById } = require('../controllers/order.controller');
const validateJWT = require('../middlewares/validateJWT'); // Middleware para validar el token JWT

// Todas las rutas requieren autenticación
router.use(validateJWT);

// Crear una nueva orden
router.post("/", createOrder);

// Obtener todas las órdenes del usuario
router.get("/", getUserOrders);

// Obtener una orden específica
router.get("/:orderId", getOrderById);

module.exports = router; // Exportar el router para usarlo en otros archivos