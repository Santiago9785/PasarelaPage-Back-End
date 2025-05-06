const checkRole = (roles) => {
    return (req, res, next) => {
      console.log("Usuario autenticado:", req.user);  // Verifica si `role` está presente
        
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Acceso denegado. No tienes permisos" });

      }
      next();
    };
  };
  
  module.exports = checkRole;
  