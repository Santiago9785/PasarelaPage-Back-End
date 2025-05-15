const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"],
    trim: true,
    index: true
  },
  price: {
    type: Number,
    required: [true, "El precio es obligatorio"],
    min: [0, "El precio debe ser mayor a 0"],
    index: true
  },
  category: {
    type: String,
    required: [true, "La categoría es obligatoria"],
    trim: true,
    index: true
  },
  images: [{
    type: String
  }],
  description: {
    type: String,
    trim: true
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, "El stock no puede ser negativo"]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para búsquedas comunes
productSchema.index({ name: 'text', category: 'text' });
productSchema.index({ category: 1, price: 1 });

// Middleware para validar antes de guardar
productSchema.pre('save', function(next) {
  console.log('Validando producto antes de guardar...');
  next();
});

// Middleware para validar antes de actualizar
productSchema.pre('findOneAndUpdate', function(next) {
  console.log('Validando producto antes de actualizar...');
  next();
});

const Product = mongoose.model("Product", productSchema);

// Crear índices en segundo plano
Product.createIndexes().catch(err => console.error('Error creando índices:', err));

module.exports = Product;
