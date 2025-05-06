const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"]
  },
  price: {
    type: Number,
    required: [true, "El precio es obligatorio"],
    min: [0, "El precio debe ser mayor a 0"]
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
