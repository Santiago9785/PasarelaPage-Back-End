const Order = require("../models/order.model");

// Crear una nueva orden
const createOrder = async (req, res) => {
  try {
    const { items, total, paymentMethod } = req.body;

    const newOrder = new Order({
      user: req.user.id, // Esto lo pone el middleware JWT
      items,
      total,
      paymentMethod,
    });

    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error al crear la orden:", error);
    res.status(500).json({ message: "Error al crear la orden" });
  }
};

// Obtener órdenes del usuario autenticado
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate("items.productId");

    res.json(orders);
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    res.status(500).json({ message: "Error al obtener las órdenes" });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
};
