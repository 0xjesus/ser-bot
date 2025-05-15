import WhatsAppAIService from '#services/whatsappai.service.js';
import WahaService from '#services/waha.service.js';
import { PrimateService } from '@thewebchimp/primate';

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
}

export default MainController;
