// server.js
require("dotenv").config(); // Carga variables de entorno

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

// Importar rutas
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const orderRoutes = require("./routes/order.routes");

// Crear la aplicación Express
const app = express();

// Validar variable de entorno MONGO_URI
if (!process.env.MONGO_URI) {
  console.error("Error: MONGO_URI no está definida en el archivo .env");
  process.exit(1); // Finaliza el proceso si no hay URI
}

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conectado a la base de datos de MongoDB"))
  .catch((error) => {
    console.error("Error al conectar con MongoDB:", error.message);
    console.error("URI usada:", process.env.MONGO_URI);
    process.exit(1); // Finaliza el proceso en caso de error
  });

// Middlewares
app.use(express.json()); // Parseo de JSON
app.use(cors()); // Habilitar CORS
app.use(morgan("dev")); // Logging de solicitudes HTTP

// Prefijo global para rutas de la API
const apiRouter = express.Router();
app.use("/api", apiRouter); // Todas las rutas bajo /api

// Rutas de la API (sin repetir /api en cada una)
apiRouter.use("/products", productRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);

// Ruta principal
app.get("/", (req, res) => {
  res.json({ message: "API Ecommerce funcionando 🚀" });
});

// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});