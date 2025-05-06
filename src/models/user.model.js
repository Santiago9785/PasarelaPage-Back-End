// models/user.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Para encriptar las contraseñas

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Se recomienda encriptarla antes de guardar
  role: { type: String, enum: ["admin", "user"], default: "user" }
});

// Middleware para encriptar la contraseña antes de guardar el usuario
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
