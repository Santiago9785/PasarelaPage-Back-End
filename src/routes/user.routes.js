// user.routes.js
const express = require("express");
const router = express.Router();
const User = require("../models/user.model");

// Obtener todos los usuarios (GET)
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password"); // sin la contraseña
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener usuarios", error: error.message });
  }
});

// Crear un nuevo usuario (POST)
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const newUser = new User({ name, email, password, role });
    await newUser.save();
    res.status(201).json(newUser); // Devuelve el nuevo usuario creado
  } catch (error) {
    res.status(500).json({ msg: "Error al crear el usuario", error: error.message });
  }
});

module.exports = router;
