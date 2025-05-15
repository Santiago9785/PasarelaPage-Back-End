const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");

const validateFields = require("../middlewares/validateFields");
const authenticateToken = require("../middlewares/authMiddleware");
const checkRole = require("../middlewares/roleMiddleware");

// ✅ Obtener todos los productos (público)
router.get("/", getProducts);

// ✅ Obtener un producto por ID (público)
router.get(
  "/:id",
  [
    check("id", "El ID debe ser un número válido").isNumeric(),
    validateFields,
  ],
  getProductById
);

// ✅ Crear un producto (privado: solo admins con token)
router.post(
  "/",
  [
    authenticateToken,
    checkRole(["admin"]),
    check("name", "El nombre es obligatorio").not().isEmpty(),
    check("price", "El precio debe ser un número válido").isFloat({ gt: 0 }),
    validateFields,
  ],
  createProduct
);

// Rutas protegidas (requieren autenticación)
router.put("/:id", authenticateToken, checkRole(["admin"]), updateProduct);
router.delete("/:id", authenticateToken, checkRole(["admin"]), deleteProduct);

module.exports = router;
