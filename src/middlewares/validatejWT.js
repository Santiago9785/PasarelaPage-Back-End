const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Verificar si hay un refresh token
        const refreshToken = req.headers['x-refresh-token'];
        if (!refreshToken) {LL
          return res.status(401).json({
            message: 'Token expirado',
            code: 'TOKEN_EXPIRED',
            expiredAt: error.expiredAt
          });
        }

        // Verificar el refresh token
        try {
          const decodedRefresh = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

          // Generar nuevo access token
          const newAccessToken = jwt.sign(
            { uid: decodedRefresh.uid, role: decodedRefresh.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );

          // Agregar el nuevo token a la respuesta
          res.setHeader('x-new-token', newAccessToken);

          // Continuar con la petición usando la información del refresh token
          req.user = decodedRefresh;
          next();
        } catch (refreshError) {
          return res.status(401).json({
            message: 'Refresh token inválido o expirado',
            code: 'REFRESH_TOKEN_INVALID'
          });
        }
      } else {
        return res.status(401).json({
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
    }
  } catch (error) {
    console.error('Error en validateJWT:', error);
    return res.status(500).json({
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    })
  }
};

module.exports = validateJWT;