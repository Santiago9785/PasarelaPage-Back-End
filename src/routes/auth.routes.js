const express = require("express");
const router = express.Router();

// Importamos las funciones del controlador
const { register, login, refreshToken, logout } = require("../controllers/auth.controller");

// Ruta para registrar usuarios
router.post("/register", register);

// Ruta para login de usuarios
router.post("/login", login);

// Ruta para refrescar el token
router.post("/refresh-token", refreshToken);

// Ruta para logout
router.post("/logout", logout);

module.exports = router;
