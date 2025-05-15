import WhatsAppAIService from '#services/whatsappai.service.js';
import WahaService from '#services/waha.service.js';
import { PrimateService } from '@thewebchimp/primate';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
// Inicializar Prisma Client
const prisma = new PrismaClient();
class MainController {
    /**
     * Procesa webhooks entrantes de WAHA (WhatsApp) - Versión simplificada solo para texto
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    static async processWebhook(req, res) {
        console.log('[Controller] WEBHOOK RECEIVED: Starting processing');
        let responseStatus = false; // Flag para rastrear si ya respondimos

        try {
            const body = req.body || {};
            const event = body.event || '';
            const payload = body.payload || {};

            // Log básico para depuración
            console.info('[Controller] WEBHOOK DATA:', {
                eventType: event,
                messageType: payload._data?.type || 'undefined',
                hasContent: !!payload.body,
                fromMe: payload.fromMe || false,
                hasMedia: payload.hasMedia || false
            });

            // Verificar si es un mensaje de texto
            if (event === 'message' && payload && payload.body && !payload.fromMe && !payload.hasMedia) {
                const chatId = payload.from;
                const from = payload.from;
                const content = payload.body;
                const messageId = payload.id;

                console.log('[Controller] TEXT MESSAGE DETECTED:', {
                    chatId,
                    messageId,
                    contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
                });

                // Responder al webhook inmediatamente
                console.log('[Controller] SENDING IMMEDIATE RESPONSE TO WEBHOOK: HTTP 200');
                res.status(200).json({ message: 'Webhook received, processing text message' });
                responseStatus = true; // Ya respondimos

                // Procesar mensaje de texto de forma asíncrona
                console.log('[Controller] STARTING ASYNC PROCESSING for message:', messageId);
                // Usamos una función directamente aquí para evitar problemas con 'this'
                MainController.handleTextMessageAsync(chatId, from, content, messageId);
                return;
            }

            // Respuesta genérica para otros tipos de webhooks (solo si no hemos respondido ya)
            if (!responseStatus) {
                console.log('[Controller] NON-TEXT MESSAGE OR EVENT: Sending standard response');
                return res.status(200).json({
                    message: 'Webhook received but not processed (not a text message)',
                    event: event,
                    payloadType: payload._data?.type || 'unknown'
                });
            }

        } catch (error) {
            // Solo enviar respuesta de error si no hemos respondido ya
            if (!responseStatus) {
                console.error('[Controller] ERROR PROCESSING WEBHOOK:', error.message);
                console.error('[Controller] ERROR STACK:', error.stack);
                console.error('[Controller] REQUEST BODY:', JSON.stringify(req.body || 'No body', null, 2));
                return res.status(500).json({
                    message: 'Error processing webhook',
                    error: error.message
                });
            } else {
                // Si ya respondimos pero ocurrió un error, solo registrarlo
                console.error('[Controller] ERROR AFTER RESPONSE SENT:', error.message);
                console.error('[Controller] ERROR STACK:', error.stack);
            }
        }
    }

    /**
     * Procesa un mensaje de texto de forma asíncrona
     * @param {string} chatId - ID del chat
     * @param {string} sender - Remitente del mensaje
     * @param {string} content - Contenido del mensaje
     * @param {string} messageId - ID del mensaje
     */
    static async handleTextMessageAsync(chatId, sender, content, messageId) {
        console.log(`[Controller] ASYNC PROCESSING STARTED: chatId=${chatId}, messageId=${messageId}`);

        try {
            // Indicar al usuario que estamos procesando su mensaje
            console.log(`[Controller] SENDING TYPING INDICATOR to ${chatId}`);
            await WahaService.startTyping(chatId);
            console.log(`[Controller] TYPING INDICATOR SENT`);

            // Procesar el mensaje con la IA
            console.log(`[Controller] CALLING AI SERVICE with message: "${content.substring(0, 30)}..."`);
            const result = await WhatsAppAIService.processMessage({
                chatId,
                sender,
                content,
                messageId
            });

            // Verificar resultado
            if (result.success) {
                console.log(`[Controller] AI PROCESSING SUCCESSFUL for message ${messageId}`);
            } else {
                console.warn(`[Controller] AI PROCESSING RETURNED ERROR: ${result.error || 'Unknown error'}`);
                throw new Error(result.error || 'Error desconocido al procesar mensaje');
            }

        } catch (error) {
            console.error(`[Controller] ERROR PROCESSING MESSAGE ASYNC: ${error.message}`, error);
            console.error(`[Controller] ERROR STACK: ${error.stack}`);

            // Intentar enviar mensaje de error al usuario
            try {
                console.log(`[Controller] SENDING ERROR MESSAGE to ${chatId}`);
                await WahaService.stopTyping(chatId);
                await WahaService.sendText(
                    chatId,
                    'Lo siento, tuve un problema al procesar tu mensaje. Por favor, inténtalo de nuevo en unos momentos.'
                );
                console.log(`[Controller] ERROR MESSAGE SENT`);
            } catch (sendError) {
                console.error(`[Controller] FAILED TO SEND ERROR MESSAGE: ${sendError.message}`);
                console.error(`[Controller] ERROR MESSAGE STACK: ${sendError.stack}`);
            }
        } finally {
            console.log(`[Controller] ASYNC PROCESSING COMPLETED for message ${messageId}`);
        }
    }

	/**
     * Obtiene todos los contactos del sistema
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    static async getAllContacts(req, res) {
        console.log('[Controller] REQUEST RECEIVED: Getting all contacts');

        try {
            // Obtener parámetros de paginación y filtros
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const status = req.query.status || undefined;
            const search = req.query.search || undefined;
            const sortBy = req.query.sortBy || 'lastContactAt';
            const sortOrder = req.query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

            // Construir el objeto de filtros para la consulta
            let whereClause = {};

            // Filtrar por estado
            if (status) {
                whereClause.status = status;
            }

            // Búsqueda por nombre, email o teléfono
            if (search) {
                whereClause.OR = [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { phoneNumber: { contains: search } }
                ];
            }

            // Ejecutar consulta con Prisma
            const contacts = await prisma.contact.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder
                },
                include: {
                    _count: {
                        select: {
                            bookings: true,
                            conversations: true
                        }
                    }
                }
            });

            // Obtener el total de contactos para la paginación
            const totalContacts = await prisma.contact.count({
                where: whereClause
            });

            // Calcular metadatos de paginación
            const totalPages = Math.ceil(totalContacts / limit);

            // Responder con los datos
            console.log(`[Controller] SUCCESS: Retrieved ${contacts.length} contacts`);
            return res.status(200).json({
                success: true,
                data: {
                    contacts,
                    pagination: {
                        total: totalContacts,
                        page,
                        limit,
                        totalPages,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('[Controller] ERROR GETTING CONTACTS:', error.message);
            console.error('[Controller] ERROR STACK:', error.stack);

            return res.status(500).json({
                success: false,
                message: 'Error al obtener contactos',
                error: error.message
            });
        }
    }

    /**
     * Obtiene todas las reservas (bookings) del sistema
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    static async getAllBookings(req, res) {
        console.log('[Controller] REQUEST RECEIVED: Getting all bookings');

        try {
            // Obtener parámetros de paginación y filtros
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const status = req.query.status || undefined;
            const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : undefined;
            const toDate = req.query.toDate ? new Date(req.query.toDate) : undefined;
            const search = req.query.search || undefined;
            const sortBy = req.query.sortBy || 'dateTime';
            const sortOrder = req.query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

            // Construir el objeto de filtros para la consulta
            let whereClause = {};

            // Filtrar por estado de la reserva
            if (status) {
                whereClause.status = status;
            }

            // Filtrar por rango de fechas
            if (fromDate || toDate) {
                whereClause.dateTime = {};

                if (fromDate) {
                    whereClause.dateTime.gte = fromDate;
                }

                if (toDate) {
                    whereClause.dateTime.lte = toDate;
                }
            }

            // Búsqueda por nombre de servicio o notas
            if (search) {
                whereClause.OR = [
                    { serviceName: { contains: search } },
                    { notes: { contains: search } },
                    {
                        contact: {
                            OR: [
                                { name: { contains: search } },
                                { phoneNumber: { contains: search } },
                                { email: { contains: search } }
                            ]
                        }
                    }
                ];
            }

            // Ejecutar consulta con Prisma
            const bookings = await prisma.booking.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder
                },
                include: {
                    contact: {
                        select: {
                            id: true,
                            name: true,
                            phoneNumber: true,
                            email: true
                        }
                    }
                }
            });

            // Obtener el total de reservas para la paginación
            const totalBookings = await prisma.booking.count({
                where: whereClause
            });

            // Calcular metadatos de paginación
            const totalPages = Math.ceil(totalBookings / limit);

            // Responder con los datos
            console.log(`[Controller] SUCCESS: Retrieved ${bookings.length} bookings`);
            return res.status(200).json({
                success: true,
                data: {
                    bookings,
                    pagination: {
                        total: totalBookings,
                        page,
                        limit,
                        totalPages,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            });

        } catch (error) {
            console.error('[Controller] ERROR GETTING BOOKINGS:', error.message);
            console.error('[Controller] ERROR STACK:', error.stack);

            return res.status(500).json({
                success: false,
                message: 'Error al obtener reservas',
                error: error.message
            });
        }
    }

    /**
     * Genera y descarga reportes en formato Excel
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    static async downloadReport(req, res) {
        console.log('[Controller] REQUEST RECEIVED: Generating Excel report');

        try {
            // Obtener tipo de reporte y filtros
            const reportType = req.query.type || 'contacts';
            const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : undefined;
            const toDate = req.query.toDate ? new Date(req.query.toDate) : undefined;
            const status = req.query.status || undefined;

            let data = [];
            let fileName = '';
            let workbook = new ExcelJS.Workbook();
            let worksheet;

            // Crear reporte según el tipo solicitado
            switch (reportType.toLowerCase()) {
                case 'contacts':
                    // Construir el objeto de filtros para la consulta
                    let contactsWhereClause = {};

                    // Filtrar por estado
                    if (status) {
                        contactsWhereClause.status = status;
                    }

                    // Filtrar por rango de fechas de creación
                    if (fromDate || toDate) {
                        contactsWhereClause.createdAt = {};

                        if (fromDate) {
                            contactsWhereClause.createdAt.gte = fromDate;
                        }

                        if (toDate) {
                            contactsWhereClause.createdAt.lte = toDate;
                        }
                    }

                    // Obtener datos
                    data = await prisma.contact.findMany({
                        where: contactsWhereClause,
                        orderBy: {
                            lastContactAt: 'desc'
                        },
                        include: {
                            _count: {
                                select: {
                                    bookings: true,
                                    conversations: true
                                }
                            }
                        }
                    });

                    // Configurar Excel
                    fileName = `contacts_report_${new Date().toISOString().split('T')[0]}.xlsx`;
                    worksheet = workbook.addWorksheet('Contactos');

                    // Definir encabezados
                    worksheet.columns = [
                        { header: 'ID', key: 'id', width: 30 },
                        { header: 'Nombre', key: 'name', width: 30 },
                        { header: 'Teléfono', key: 'phoneNumber', width: 20 },
                        { header: 'Email', key: 'email', width: 30 },
                        { header: 'Estado', key: 'status', width: 15 },
                        { header: 'Puntaje Lead', key: 'leadScore', width: 15 },
                        { header: 'Fuente', key: 'source', width: 20 },
                        { header: 'Primer Contacto', key: 'firstContactAt', width: 20 },
                        { header: 'Último Contacto', key: 'lastContactAt', width: 20 },
                        { header: 'Reservas', key: 'bookingsCount', width: 10 },
                        { header: 'Conversaciones', key: 'conversationsCount', width: 15 },
                        { header: 'Activo', key: 'isActive', width: 10 },
                        { header: 'Opt-in', key: 'isOptedIn', width: 10 },
                        { header: 'Notas', key: 'notes', width: 40 }
                    ];

                    // Añadir datos
                    data.forEach(contact => {
                        worksheet.addRow({
                            ...contact,
                            bookingsCount: contact._count.bookings,
                            conversationsCount: contact._count.conversations,
                            firstContactAt: contact.firstContactAt.toLocaleString(),
                            lastContactAt: contact.lastContactAt.toLocaleString()
                        });
                    });

                    break;

                case 'bookings':
                    // Construir el objeto de filtros para la consulta
                    let bookingsWhereClause = {};

                    // Filtrar por estado
                    if (status) {
                        bookingsWhereClause.status = status;
                    }

                    // Filtrar por rango de fechas de la reserva
                    if (fromDate || toDate) {
                        bookingsWhereClause.dateTime = {};

                        if (fromDate) {
                            bookingsWhereClause.dateTime.gte = fromDate;
                        }

                        if (toDate) {
                            bookingsWhereClause.dateTime.lte = toDate;
                        }
                    }

                    // Obtener datos
                    data = await prisma.booking.findMany({
                        where: bookingsWhereClause,
                        orderBy: {
                            dateTime: 'desc'
                        },
                        include: {
                            contact: {
                                select: {
                                    id: true,
                                    name: true,
                                    phoneNumber: true,
                                    email: true
                                }
                            }
                        }
                    });

                    // Configurar Excel
                    fileName = `bookings_report_${new Date().toISOString().split('T')[0]}.xlsx`;
                    worksheet = workbook.addWorksheet('Reservas');

                    // Definir encabezados
                    worksheet.columns = [
                        { header: 'ID', key: 'id', width: 30 },
                        { header: 'Servicio', key: 'serviceName', width: 30 },
                        { header: 'Fecha y Hora', key: 'dateTime', width: 20 },
                        { header: 'Estado', key: 'status', width: 15 },
                        { header: 'Cliente', key: 'contactName', width: 30 },
                        { header: 'Teléfono', key: 'contactPhone', width: 20 },
                        { header: 'Email', key: 'contactEmail', width: 30 },
                        { header: 'Notas', key: 'notes', width: 40 },
                        { header: 'ID de Pago', key: 'paymentId', width: 30 },
                        { header: 'Creado', key: 'createdAt', width: 20 },
                        { header: 'Actualizado', key: 'updatedAt', width: 20 }
                    ];

                    // Añadir datos
                    data.forEach(booking => {
                        worksheet.addRow({
                            ...booking,
                            contactName: booking.contact.name,
                            contactPhone: booking.contact.phoneNumber,
                            contactEmail: booking.contact.email,
                            dateTime: booking.dateTime.toLocaleString(),
                            createdAt: booking.createdAt.toLocaleString(),
                            updatedAt: booking.updatedAt.toLocaleString()
                        });
                    });

                    break;

                case 'conversations':
                    // Construir el objeto de filtros para la consulta
                    let conversationsWhereClause = {};

                    // Filtrar por rango de fechas de inicio
                    if (fromDate || toDate) {
                        conversationsWhereClause.startedAt = {};

                        if (fromDate) {
                            conversationsWhereClause.startedAt.gte = fromDate;
                        }

                        if (toDate) {
                            conversationsWhereClause.startedAt.lte = toDate;
                        }
                    }

                    // Filtrar solo conversaciones activas o todas
                    if (status === 'ACTIVE') {
                        conversationsWhereClause.isActive = true;
                    } else if (status === 'INACTIVE') {
                        conversationsWhereClause.isActive = false;
                    }

                    // Obtener datos
                    data = await prisma.conversation.findMany({
                        where: conversationsWhereClause,
                        orderBy: {
                            startedAt: 'desc'
                        },
                        include: {
                            contact: {
                                select: {
                                    id: true,
                                    name: true,
                                    phoneNumber: true,
                                    email: true
                                }
                            },
                            _count: {
                                select: {
                                    messages: true
                                }
                            }
                        }
                    });

                    // Configurar Excel
                    fileName = `conversations_report_${new Date().toISOString().split('T')[0]}.xlsx`;
                    worksheet = workbook.addWorksheet('Conversaciones');

                    // Definir encabezados
                    worksheet.columns = [
                        { header: 'ID', key: 'id', width: 30 },
                        { header: 'Cliente', key: 'contactName', width: 30 },
                        { header: 'Teléfono', key: 'contactPhone', width: 20 },
                        { header: 'Email', key: 'contactEmail', width: 30 },
                        { header: 'Inicio', key: 'startedAt', width: 20 },
                        { header: 'Fin', key: 'endedAt', width: 20 },
                        { header: 'Intención', key: 'intent', width: 20 },
                        { header: 'Sentimiento', key: 'sentiment', width: 20 },
                        { header: 'Mensajes', key: 'messageCount', width: 10 },
                        { header: 'Activa', key: 'isActive', width: 10 },
                        { header: 'Resumen', key: 'summary', width: 50 }
                    ];

                    // Añadir datos
                    data.forEach(conversation => {
                        worksheet.addRow({
                            ...conversation,
                            contactName: conversation.contact.name,
                            contactPhone: conversation.contact.phoneNumber,
                            contactEmail: conversation.contact.email,
                            startedAt: conversation.startedAt.toLocaleString(),
                            endedAt: conversation.endedAt ? conversation.endedAt.toLocaleString() : 'En curso',
                            messageCount: conversation._count.messages
                        });
                    });

                    break;

                default:
                    throw new Error(`Tipo de reporte no válido: ${reportType}`);
            }

            // Dar formato a las columnas y encabezados
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Crear un buffer con el contenido del Excel
            const buffer = await workbook.xlsx.writeBuffer();

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

            // Enviar archivo
            console.log(`[Controller] SUCCESS: Generated Excel report: ${fileName}`);
            return res.send(Buffer.from(buffer));

        } catch (error) {
            console.error('[Controller] ERROR GENERATING REPORT:', error.message);
            console.error('[Controller] ERROR STACK:', error.stack);

            return res.status(500).json({
                success: false,
                message: 'Error al generar reporte Excel',
                error: error.message
            });
        }
    }


}

export default MainController;
