const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Función para generar tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { uid: user._id, role: user.role },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { uid: user._id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

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
      password,
      role: role || "user",
    });

    // Guardar usuario en la BD
    await newUser.save();

    // Generar tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    res.status(201).json({
      msg: "Usuario registrado exitosamente",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("Error en registro:", error.message);
    res.status(500).json({ msg: "Error al registrar usuario", error: error.message });
  }
};

// Login de usuario
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

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ msg: "Contraseña incorrecta" });
    }

    // Generar tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Guardar refresh token en la base de datos
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      msg: "Login exitoso",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("Error en login:", error.message);
    res.status(500).json({ msg: "Error al iniciar sesión", error: error.message });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ msg: "Refresh token es requerido" });
  }

  try {
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || "refresh_secret");
    
    // Buscar usuario
    const user = await User.findById(decoded.uid);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ msg: "Refresh token inválido" });
    }

    // Generar nuevos tokens
    const tokens = generateTokens(user);

    // Actualizar refresh token en la base de datos
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error("Error en refresh token:", error.message);
    res.status(401).json({ msg: "Refresh token inválido" });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const userId = req.user.uid;
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    res.json({ msg: "Logout exitoso" });
  } catch (error) {
    console.error("Error en logout:", error.message);
    res.status(500).json({ msg: "Error al cerrar sesión" });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout
};