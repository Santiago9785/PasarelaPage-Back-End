const express = require("express");
const router = express.Router();

// Importamos las funciones del controlador
const { register, login, refreshToken, logout } = require("../controllers/auth.controller");
const validateJWT = require("../middlewares/validateJWT");

// Rutas públicas
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

// Rutas protegidas
router.post("/logout", validateJWT, logout);

module.exports = router;
