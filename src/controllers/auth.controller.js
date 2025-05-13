const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Registro de usuario
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Validar entrada
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Nombre, email y contraseña son requeridos" });
    }

    // Verificar si el usuario ya existe
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ msg: "El usuario ya existe" });
    }

    // Crear usuario (la contraseña se encriptará en el modelo)
    const newUser = new User({
      name,
      email,
      password, // No encriptamos aquí, el modelo lo hace
      role: role || "user",
    });

    // Guardar usuario en la BD
    await newUser.save();

    res.status(201).json({
      msg: "Usuario registrado exitosamente",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error.message);
    res.status(500).json({ msg: "Error al registrar usuario", error: error.message });
  }
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({ msg: "Email y contraseña son requeridos" });
    }

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Usuario no encontrado" });
    }

    // Depuración
    console.log("Contraseña enviada:", password);
    console.log("Hash almacenado:", user.password);
    const validPassword = await bcrypt.compare(password, user.password);
    console.log("Resultado de bcrypt.compare:", validPassword);

    if (!validPassword) {
      return res.status(400).json({ msg: "Contraseña incorrecta" });
    }

    // Generar JWT
    const token = jwt.sign(
      { uid: user._id, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "4h" }
    );

    res.json({
      msg: "Login exitoso",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error en login:", error.message);
    res.status(500).json({ msg: "Error al iniciar sesión", error: error.message });
  }
};

module.exports = { register, login };