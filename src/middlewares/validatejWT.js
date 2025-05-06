const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {
    const token = req.header("x-token");
    if(!token){
        return res.status(4001).json({msg: "No hay token en la petición"});
    }
    //Crear el bloque try catch para validar el token
    try {
        const {uid } = jwt.verify(token, process.env.JWT_SECRET);
        req.id = uid; // Guardar el id del usuario en la petición
        next(); // Continuar con la siguiente función
    } catch (error) {
        return res.status(401).json({msg: "Token no valido"});
    }
};
module.exports = validateJWT; // Exportar la función para usarla en otros archivos