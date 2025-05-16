const Order = require("../models/order.model");

// Crear una nueva orden
const createOrder = async (req, res) => {
  try {
    const { items, total, paymentMethod } = req.body;

    console.log('Datos recibidos:', { items, total, paymentMethod });

    // Validar datos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: "Se requieren items para crear la orden",
        code: "ITEMS_REQUIRED"
      });
    }

    if (!total || isNaN(parseFloat(total))) {
      return res.status(400).json({ 
        message: "El total es requerido y debe ser un número válido",
        code: "TOTAL_REQUIRED"
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        message: "El método de pago es requerido",
        code: "PAYMENT_METHOD_REQUIRED"
      });
    }

    // Validar cada item
    const validItems = items.map(item => {
      console.log('Procesando item:', item);
      
      if (!item._id && !item.productId) {
        throw new Error("ID de producto requerido");
      }

      if (!item.name) {
        throw new Error("Nombre de producto requerido");
      }

      if (!item.price || isNaN(parseFloat(item.price))) {
        throw new Error("Precio de producto requerido y debe ser un número válido");
      }

      if (!item.quantity || isNaN(parseInt(item.quantity))) {
        throw new Error("Cantidad de producto requerida y debe ser un número válido");
      }

      return {
        productId: item._id || item.productId,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity)
      };
    });

    // Crear la orden
    const order = new Order({
      user: req.user.uid,
      items: validItems,
      total: parseFloat(total),
      paymentMethod
    });

    await order.save();

    // Poblar los datos del producto y usuario
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.productId');

    res.status(201).json({
      message: "Orden creada exitosamente",
      order: populatedOrder
    });
  } catch (error) {
    console.error("Error al crear la orden:", error);
    res.status(500).json({ 
      message: error.message || "Error al crear la orden",
      code: "ORDER_CREATION_ERROR"
    });
  }
};

// Obtener órdenes del usuario autenticado
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.uid;
    const orders = await Order.find({ user: userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.json({
      message: "Órdenes obtenidas exitosamente",
      orders
    });
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    res.status(500).json({ 
      message: "Error al obtener las órdenes",
      code: "GET_ORDERS_ERROR"
    });
  }
};

// Obtener una orden específica
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.productId')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ 
        message: "Orden no encontrada",
        code: "ORDER_NOT_FOUND"
      });
    }

    res.json({
      message: "Orden obtenida exitosamente",
      order
    });
  } catch (error) {
    console.error("Error al obtener la orden:", error);
    res.status(500).json({ 
      message: "Error al obtener la orden",
      code: "GET_ORDER_ERROR"
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById
};
