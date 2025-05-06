const express = require("express");
const router = express.Router();

// Importamos las funciones del controlador
const { register, login } = require("../controllers/auth.controller");

// Ruta para registrar usuarios
router.post("/register", register);

// Ruta para login de usuarios
router.post("/login", login);

module.exports = router;
