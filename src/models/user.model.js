const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "El nombre es requerido"], 
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, "El email es requerido"], 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "El email no es válido"]
  },
  password: { 
    type: String, 
    required: [true, "La contraseña es requerida"],
    minlength: [8, "La contraseña debe tener al menos 8 caracteres"]
  },
  role: { 
    type: String, 
    enum: {
      values: ["admin", "user"],
      message: "{VALUE} no es un rol válido"
    }, 
    default: "user" 
  }
}, { timestamps: true });

// Middleware para encriptar la contraseña antes de guardar el usuario
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;