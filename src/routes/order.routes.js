const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders } = require('../controllers/order.controller');
const validateJWT = require('../middlewares/validateJWT'); // Middleware para validar el token JWT

// Creamos las rutas para las ordenes
router.post("/", validateJWT, createOrder); // Crear una nueva orden
router.get("/", validateJWT, getUserOrders); // Obtener las ordenes del usuario autenticado

module.exports = router; // Exportar el router para usarlo en otros archivos