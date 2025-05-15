const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Acceso denegado. Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1]; // Extraer solo el token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    req.user = decoded; // Guardamos la info del usuario en el request
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Token expirado",
        code: "TOKEN_EXPIRED"
      });
    }
    res.status(401).json({ message: "Token inválido" });
  }
};

module.exports = authenticateToken;
