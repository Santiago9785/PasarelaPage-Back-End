const Product = require("../models/product.model");

// Obtener todos los productos
const getProducts = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = {};

    // Filtrar por categoría si se proporciona
    if (category) {
      query.category = category;
    }

    // Búsqueda por texto en nombre o categoría
    if (search) {
      query.$text = { $search: search };
    }

    // Construir opciones de ordenamiento
    let sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions = { createdAt: -1 }; // Ordenar por fecha de creación por defecto
    }

    const products = await Product.find(query)
      .sort(sortOptions)
      .select('-__v')
      .lean(); // Usar lean() para obtener objetos JavaScript planos

    res.json(products);
  } catch (error) {
    console.error('Error en getProducts:', error);
    res.status(500).json({ message: "Error al obtener productos", error: error.message });
  }
};

// Obtener un producto por ID
const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id)
      .select('-__v')
      .lean();
      
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(product);
  } catch (error) {
    console.error('Error en getProductById:', error);
    res.status(500).json({ message: "Error al buscar producto", error: error.message });
  }
};

// Crear un nuevo producto
const createProduct = async (req, res) => {
  console.time('createProduct');
  try {
    const { name, price, category, images, description, stock } = req.body;

    // Validar campos requeridos
    if (!name || price === undefined || !category) {
      return res.status(400).json({ 
        message: "Faltan campos obligatorios",
        required: ["name", "price", "category"]
      });
    }

    console.log('Creando nuevo producto:', { name, price, category });
    
    const newProduct = new Product({
      name,
      price,
      category,
      images: images || [],
      description,
      stock: stock || 0
    });

    const savedProduct = await newProduct.save();
    console.log('Producto guardado exitosamente');
    
    console.timeEnd('createProduct');
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error en createProduct:', error);
    console.timeEnd('createProduct');
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Error de validación", 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(400).json({ 
      message: "Error al crear producto", 
      error: error.message
    });
  }
};

// Actualizar un producto
const updateProduct = async (req, res) => {
  console.time('updateProduct');
  try {
    const { id } = req.params;
    const { name, price, category, images, description, stock } = req.body;

    console.log('Buscando producto:', id);
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Actualizar solo los campos proporcionados
    const updates = {};
    if (name) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (category) updates.category = category;
    if (images) updates.images = images;
    if (description !== undefined) updates.description = description;
    if (stock !== undefined) updates.stock = stock;

    console.log('Actualizando producto con:', updates);
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { 
        new: true, 
        runValidators: true,
        lean: true // Usar lean() para mejor rendimiento
      }
    ).select('-__v');

    console.timeEnd('updateProduct');
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error en updateProduct:', error);
    console.timeEnd('updateProduct');
    res.status(400).json({ 
      message: "Error al actualizar producto", 
      error: error.message,
      details: error.errors
    });
  }
};

// Eliminar un producto
const deleteProduct = async (req, res) => {
  console.time('deleteProduct');
  try {
    const { id } = req.params;
    console.log('Eliminando producto:', id);
    
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    
    console.timeEnd('deleteProduct');
    res.json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error('Error en deleteProduct:', error);
    console.timeEnd('deleteProduct');
    res.status(500).json({ message: "Error al eliminar producto", error: error.message });
  }
};

module.exports = { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
};
