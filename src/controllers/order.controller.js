const Order = require("../models/order.model");

// Crear una nueva orden
const createOrder = async (req, res) => {
  try {
    const { items, total, paymentMethod } = req.body;
    const userId = req.user.id; // Obtener el ID del usuario del token

    const order = new Order({
      user: userId,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total,
      paymentMethod,
      isPaid: false,
      paidAt: null
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Error al crear la orden:", error);
    res.status(500).json({ message: error.message });
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
