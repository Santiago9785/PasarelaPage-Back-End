// Esta constante es para crear el modelo de la base de datos
const { Schema, model } = require("mongoose");

// Se crea el esquema de la base de datos
const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Referencia al modelo de usuario
    required: true  // Campo requerido
  },
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      }, // Referencia al modelo de producto
      name: String,         // Nombre del producto
      price: Number,        // Precio del producto
      quantity: Number      // Cantidad del producto
    }
  ],
  total: {
    type: String,          // Total de la orden
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'wompi'], // Métodos de pago permitidos
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'CANCELLED', 'FAILED'],
    default: 'PENDING'
  },
  paidAt: {
    type: Date
  },
  wompiReference: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Se exporta el modelo de la base de datos
module.exports = model("Order", orderSchema);
