const Order = require("../models/order.model");
const paypal = require('@paypal/checkout-server-sdk');
const crypto = require('crypto');

// Configuración de PayPal
const environment = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Configuración de Wompi
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const WOMPI_API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';

// Función para generar firma de integridad de Wompi
function generateWompiSignature(reference, amountInCents, currency = 'COP') {
    const dataToSign = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
    return crypto.createHash('sha256').update(dataToSign).digest('hex');
}

// Función para actualizar el estado de la orden
async function updateOrderStatus(orderId, status, paymentDetails = {}) {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error("Orden no encontrada");
        }

        // Mapear estados de Wompi a nuestros estados
        let mappedStatus = status;
        if (status === 'APPROVED' || status === 'COMPLETED' || status === 'PAYMENT_APPROVED') {
            mappedStatus = 'APPROVED';
        } else if (status === 'REJECTED' || status === 'FAILED' || status === 'DECLINED') {
            mappedStatus = 'FAILED';
        } else if (status === 'CANCELLED' || status === 'VOIDED') {
            mappedStatus = 'CANCELLED';
        } else {
            mappedStatus = 'PENDING';
        }

        order.status = mappedStatus;
        order.paidAt = mappedStatus === 'APPROVED' ? new Date() : null;
        order.paymentDetails = {
            ...order.paymentDetails,
            ...paymentDetails
        };

        await order.save();
        return order;
    } catch (error) {
        console.error("Error al actualizar estado de la orden:", error);
        throw error;
    }
}

// Crear pago con PayPal
const createPayPalPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const dbOrder = await Order.findById(orderId);

        if (!dbOrder) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: dbOrder.total
                },
                description: `Orden #${dbOrder._id}`,
                custom_id: dbOrder._id.toString()
            }],
            application_context: {
                brand_name: 'Tu Tienda',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW',
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
            }
        });

        const order = await paypalClient.execute(request);

        res.json(order.result);
    } catch (error) {
        console.error("Error al crear pago con PayPal:", error);
        res.status(500).json({ message: error.message });
    }
};

// Capturar pago de PayPal
const capturePayPalPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Verificar que la orden existe
        const dbOrder = await Order.findById(orderId);
        if (!dbOrder) {
            return res.status(404).json({ 
                message: "Orden no encontrada",
                code: "ORDER_NOT_FOUND"
            });
        }

        // Verificar si la orden ya está pagada
        if (dbOrder.isPaid) {
            return res.status(400).json({
                message: "Esta orden ya ha sido pagada",
                code: "ORDER_ALREADY_PAID",
                order: dbOrder
            });
        }

        // Verificar si la orden tiene un ID de PayPal
        if (!dbOrder.paypalOrderId) {
            return res.status(400).json({
                message: "Esta orden no tiene un ID de PayPal asociado",
                code: "NO_PAYPAL_ORDER_ID",
                order: dbOrder
            });
        }

        // Intentar capturar el pago usando el ID de PayPal almacenado
        const request = new paypal.orders.OrdersCaptureRequest(dbOrder.paypalOrderId);
        const capture = await paypalClient.execute(request);
        
        // Verificar el estado de la captura
        if (!capture || !capture.result) {
            throw new Error("No se pudo capturar el pago de PayPal");
        }

        // Determinar el estado basado en la respuesta de PayPal
        let status = 'PENDING';
        if (capture.result.status === 'COMPLETED') {
            status = 'COMPLETED';
        } else if (capture.result.status === 'SAVED') {
            status = 'PENDING';
        } else if (capture.result.status === 'VOIDED') {
            status = 'CANCELLED';
        }

        // Actualizar la orden con los detalles del pago
        await updateOrderStatus(dbOrder._id, status, {
            paypalOrderId: capture.result.id,
            paymentMethod: 'paypal',
            lastChecked: new Date(),
            paypalStatus: capture.result.status,
            paypalDetails: {
                payer: capture.result.payer,
                purchase_units: capture.result.purchase_units,
                create_time: capture.result.create_time,
                update_time: capture.result.update_time
            }
        });

        // Obtener la orden actualizada
        const updatedOrder = await Order.findById(dbOrder._id);

        res.json({
            message: "Pago procesado exitosamente",
            status: status,
            order: updatedOrder,
            paypalDetails: capture.result
        });

    } catch (error) {
        console.error("Error al capturar pago de PayPal:", error);
        
        // Determinar el código de error específico
        let errorCode = "INTERNAL_ERROR";
        let statusCode = 500;
        let errorMessage = error.message || "Error al procesar el pago";

        if (error.statusCode === 404) {
            errorCode = "PAYMENT_NOT_FOUND";
            statusCode = 404;
            errorMessage = "No se encontró la orden de pago en PayPal";
        } else if (error.statusCode === 422) {
            errorCode = "PAYMENT_ALREADY_CAPTURED";
            statusCode = 422;
            errorMessage = "El pago ya ha sido capturado";
        } else if (error.name === "RESOURCE_NOT_FOUND") {
            errorCode = "INVALID_PAYPAL_ORDER";
            statusCode = 400;
            errorMessage = "ID de orden de PayPal inválido o no existe";
        }

        res.status(statusCode).json({ 
            message: errorMessage,
            code: errorCode,
            details: error.toString()
        });
    }
};

// Crear pago con Wompi
const createWompiPayment = async (req, res) => {
    try {
        // Verificar que las variables de entorno estén configuradas
        if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY || !WOMPI_INTEGRITY_SECRET) {
            throw new Error('Configuración de Wompi incompleta. Verifica las variables de entorno.');
        }

        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('user');

        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        // Verificar que la orden tenga los datos necesarios
        if (!order.user || !order.user.email || !order.user.name) {
            return res.status(400).json({ 
                message: "La orden no tiene los datos del usuario necesarios para el pago" 
            });
        }

        // Convertir el total a centavos
        const amountInCents = Math.round(parseFloat(order.total) * 100);
        const reference = `order-${orderId}-${Date.now()}`;
        const signature = generateWompiSignature(reference, amountInCents);

        // Crear la URL de pago de Wompi
        const params = new URLSearchParams({
            'public-key': WOMPI_PUBLIC_KEY,
            currency: 'COP',
            'amount-in-cents': String(amountInCents),
            reference: reference,
            'redirect-url': `${process.env.FRONTEND_URL}/payment/result`,
            'signature:integrity': signature
        });

        // Agregar datos del cliente
        params.append('customer-data:email', order.user.email);
        params.append('customer-data:full-name', order.user.name);
        params.append('customer-data:phone-number', '3001234567');
        params.append('customer-data:phone-number-prefix', '+57');

        const checkoutUrl = 'https://checkout.wompi.co/p/';
        const paymentUrl = `${checkoutUrl}?${params.toString()}`;

        // Actualizar la orden con la referencia de Wompi
        order.wompiReference = reference;
        order.status = 'PENDING';
        await order.save();

        res.json({
            message: "Pago creado exitosamente",
            paymentUrl: paymentUrl,
            reference: reference
        });
    } catch (error) {
        console.error("Error al crear pago con Wompi:", error);
        res.status(500).json({ 
            message: error.message || 'Error al procesar el pago',
            details: error.toString()
        });
    }
};

// Verificar estado de pago con Wompi
const checkWompiPaymentStatus = async (req, res) => {
    try {
        const { reference } = req.params;
        console.log('Verificando estado para referencia:', reference);
        
        // Verificar que la referencia existe
        if (!reference) {
            return res.status(400).json({
                message: "Se requiere la referencia del pago",
                code: "REFERENCE_REQUIRED"
            });
        }

        // Verificar que las credenciales de Wompi estén configuradas
        if (!WOMPI_PRIVATE_KEY) {
            console.error('Error: Credenciales de Wompi no configuradas');
            return res.status(500).json({
                message: "Error de configuración de Wompi",
                code: "WOMPI_CONFIG_ERROR"
            });
        }

        // Buscar la orden por la referencia de Wompi
        const order = await Order.findOne({ wompiReference: reference });
        console.log('Orden encontrada por referencia:', order ? 'Sí' : 'No');

        // Si la referencia parece ser un ID de transacción de Wompi
        if (reference.includes('-') && reference.startsWith('1115885')) {
            console.log('Consultando transacción directamente con ID:', reference);
            const response = await fetch(`${WOMPI_API_URL}/transactions/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Respuesta de Wompi - Status:', response.status);
            const data = await response.json();
            console.log('Respuesta de Wompi:', JSON.stringify(data, null, 2));

            if (response.ok && data.data) {
                // Buscar la orden por la referencia de Wompi
                const orderByWompiRef = await Order.findOne({ 
                    wompiReference: data.data.reference 
                });

                if (orderByWompiRef) {
                    // Actualizar estado de la orden
                    await updateOrderStatus(orderByWompiRef._id, data.data.status, {
                        wompiTransactionId: data.data.id,
                        paymentMethod: 'wompi',
                        lastChecked: new Date(),
                        wompiDetails: {
                            status: data.data.status,
                            amount_in_cents: data.data.amount_in_cents,
                            currency: data.data.currency,
                            created_at: data.data.created_at,
                            finalized_at: data.data.finalized_at,
                            payment_method: data.data.payment_method,
                            payment_method_type: data.data.payment_method_type,
                            transaction_id: data.data.id,
                            reference: data.data.reference,
                            nequi_id: data.data.payment_method_details?.nequi_id
                        }
                    });

                    const updatedOrder = await Order.findById(orderByWompiRef._id);
                    return res.json({
                        message: "Estado del pago obtenido exitosamente",
                        status: updatedOrder.status,
                        order: updatedOrder,
                        wompiDetails: data.data
                    });
                }
            }
        }

        if (!order) {
            // Intentar buscar por ID de orden
            const orderId = reference.split('-')[1];
            if (orderId) {
                const orderById = await Order.findById(orderId);
                if (orderById) {
                    console.log('Orden encontrada por ID:', orderById._id);
                    console.log('Referencia actual:', orderById.wompiReference);
                    console.log('Detalles de pago:', orderById.paymentDetails);

                    // Si la orden tiene un ID de transacción de Wompi, intentar con ese
                    if (orderById.paymentDetails?.wompiTransactionId) {
                        console.log('Intentando con ID de transacción:', orderById.paymentDetails.wompiTransactionId);
                        const response = await fetch(`${WOMPI_API_URL}/transactions/${orderById.paymentDetails.wompiTransactionId}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        const data = await response.json();
                        if (response.ok && data.data) {
                            await updateOrderStatus(orderById._id, data.data.status, {
                                wompiTransactionId: data.data.id,
                                paymentMethod: 'wompi',
                                lastChecked: new Date(),
                                wompiDetails: {
                                    status: data.data.status,
                                    amount_in_cents: data.data.amount_in_cents,
                                    currency: data.data.currency,
                                    created_at: data.data.created_at,
                                    finalized_at: data.data.finalized_at,
                                    payment_method: data.data.payment_method,
                                    payment_method_type: data.data.payment_method_type,
                                    transaction_id: data.data.id,
                                    reference: data.data.reference,
                                    nequi_id: data.data.payment_method_details?.nequi_id
                                }
                            });

                            const updatedOrder = await Order.findById(orderById._id);
                            return res.json({
                                message: "Estado del pago obtenido exitosamente",
                                status: data.data.status,
                                order: updatedOrder,
                                wompiDetails: data.data
                            });
                        }
                    }

                    return res.status(400).json({
                        message: "La orden existe pero tiene una referencia diferente",
                        code: "DIFFERENT_REFERENCE",
                        order: orderById,
                        currentReference: orderById.wompiReference,
                        paymentDetails: orderById.paymentDetails
                    });
                }
            }

            return res.status(404).json({
                message: "No se encontró una orden con esta referencia",
                code: "ORDER_NOT_FOUND"
            });
        }

        // Intentar con la referencia de la orden
        console.log('Consultando con referencia de orden:', reference);
        const response = await fetch(`${WOMPI_API_URL}/transactions/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Respuesta de Wompi - Status:', response.status);
        const data = await response.json();
        console.log('Respuesta de Wompi:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error("Error de Wompi:", data);
            
            // Si la transacción no existe, actualizar el estado de la orden
            if (response.status === 404) {
                await updateOrderStatus(order._id, 'FAILED', {
                    paymentMethod: 'wompi',
                    lastChecked: new Date(),
                    error: "Transacción no encontrada en Wompi"
                });

                return res.status(404).json({
                    message: "La transacción no existe en Wompi",
                    code: "TRANSACTION_NOT_FOUND",
                    order: await Order.findById(order._id)
                });
            }

            // Para otros errores
            const errorMessage = data.error?.reason || 
                               data.error?.message || 
                               'Error al verificar estado del pago';
            
            await updateOrderStatus(order._id, 'FAILED', {
                paymentMethod: 'wompi',
                lastChecked: new Date(),
                error: errorMessage
            });

            return res.status(response.status).json({
                message: errorMessage,
                code: "WOMPI_ERROR",
                order: await Order.findById(order._id)
            });
        }

        // Verificar que la respuesta tiene la estructura esperada
        if (!data.data || !data.data.status) {
            console.error('Respuesta inválida de Wompi:', data);
            await updateOrderStatus(order._id, 'FAILED', {
                paymentMethod: 'wompi',
                lastChecked: new Date(),
                error: "Respuesta inválida de Wompi"
            });

            return res.status(500).json({
                message: "Respuesta inválida de Wompi",
                code: "INVALID_RESPONSE",
                order: await Order.findById(order._id)
            });
        }

        console.log('Actualizando estado de la orden...');
        // Actualizar estado de la orden
        await updateOrderStatus(order._id, data.data.status, {
            wompiTransactionId: data.data.id,
            paymentMethod: 'wompi',
            lastChecked: new Date(),
            wompiDetails: {
                status: data.data.status,
                amount_in_cents: data.data.amount_in_cents,
                currency: data.data.currency,
                created_at: data.data.created_at,
                finalized_at: data.data.finalized_at,
                payment_method: data.data.payment_method,
                payment_method_type: data.data.payment_method_type,
                transaction_id: data.data.id,
                reference: data.data.reference,
                nequi_id: data.data.payment_method_details?.nequi_id
            }
        });

        // Obtener la orden actualizada
        const updatedOrder = await Order.findById(order._id);
        console.log('Orden actualizada:', updatedOrder.status);

        res.json({
            message: "Estado del pago obtenido exitosamente",
            status: updatedOrder.status,
            order: updatedOrder,
            wompiDetails: data.data
        });

    } catch (error) {
        console.error("Error al verificar estado del pago:", error);
        console.error("Stack trace:", error.stack);
        
        res.status(500).json({
            message: "Error interno al verificar el estado del pago",
            code: "INTERNAL_ERROR",
            details: error.message
        });
    }
};

// Webhook para actualizar estado de pago
const handlePaymentWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-wompi-signature'];
        const body = req.body;

        if (!signature) {
            return res.status(401).json({ message: "Firma no recibida" });
        }

        // Verificar firma de Wompi
        const transaction = body.data.transaction;
        const dataToSign = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${body.timestamp}${WOMPI_INTEGRITY_SECRET}`;
        const expectedSignature = crypto.createHash('sha256').update(dataToSign).digest('hex');

        if (signature !== expectedSignature) {
            return res.status(401).json({ message: "Firma inválida" });
        }

        // Procesar el evento
        if (body.event === 'transaction.updated') {
            const orderId = transaction.reference.split('-')[1];
            const order = await Order.findById(orderId);
            
            if (order) {
                // Actualizar estado de la orden
                await updateOrderStatus(orderId, transaction.status, {
                    wompiTransactionId: transaction.id,
                    paymentMethod: 'wompi',
                    lastChecked: new Date()
                });
            }
        }

        res.json({ message: "Webhook procesado correctamente" });
    } catch (error) {
        console.error("Error al procesar webhook:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPayPalPayment,
    capturePayPalPayment,
    createWompiPayment,
    checkWompiPaymentStatus,
    handlePaymentWebhook
}; 