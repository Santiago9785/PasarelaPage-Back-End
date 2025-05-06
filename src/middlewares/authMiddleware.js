const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
 

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Acceso denegado. Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1]; // Extraer solo el token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; //Guardamos la info del usuario en el request
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido" });
  }
};

module.exports = authenticateToken;
