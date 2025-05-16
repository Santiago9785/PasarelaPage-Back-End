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
const paymentRoutes = require("./routes/payment.routes");

// Crear la aplicación Express
const app = express();

// Configuración de MongoDB
mongoose.set('debug', true); // Activar logs de MongoDB
mongoose.set('strictQuery', false);

// Validar variable de entorno MONGO_URI
if (!process.env.MONGO_URI) {
  console.error("Error: MONGO_URI no está definida en el archivo .env");
  process.exit(1);
}

// Configuración de la conexión MongoDB
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout después de 5 segundos
  socketTimeoutMS: 45000, // Timeout de socket después de 45 segundos
};

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log("Conectado a la base de datos de MongoDB");
    // Verificar la conexión
    const db = mongoose.connection;
    console.log("Estado de la conexión:", db.readyState);
    console.log("URI usada:", process.env.MONGO_URI);
  })
  .catch((error) => {
    console.error("Error al conectar con MongoDB:", error.message);
    console.error("URI usada:", process.env.MONGO_URI);
    process.exit(1);
  });

// Middlewares
app.use(express.json({ limit: '50mb' })); // Aumentar límite de tamaño
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use(morgan("dev"));

// Prefijo global para rutas de la API
const apiRouter = express.Router();
app.use("/api", apiRouter);

// Rutas de la API
apiRouter.use("/products", productRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/payments", paymentRoutes);
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