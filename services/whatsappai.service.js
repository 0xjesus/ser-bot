import 'dotenv/config';
import axios from 'axios';
import {PrismaClient} from '@prisma/client';
import WahaService from '#services/waha.service.js';

const prisma = new PrismaClient();
class WhatsAppAIService {
	/**
	 * Procesa un mensaje entrante de WhatsApp
	 * @param {Object} messageData - Datos del mensaje
	 * @returns {Promise<Object>} - Resultado del procesamiento
	 */
	static async processMessage(messageData) {
		const { chatId, content, sender, messageId } = messageData;
		console.log(`[AI-Service] PROCESSING MESSAGE: "${ content.substring(0, 50) }${ content.length > 50 ? '...' : '' }"`);
		console.log(`[AI-Service] MESSAGE DETAILS: chatId=${ chatId }, sender=${ sender }, messageId=${ messageId }`);

		try {
			console.log(`[AI-Service] STEP 1/9: Finding or creating contact for ${ sender }`);
			// 1. Obtener o crear contacto
			const contact = await this.findOrCreateContact(sender, chatId);
			console.log(`[AI-Service] CONTACT: id=${ contact.id }, name="${ contact.name }", status=${ contact.status }`);

			console.log(`[AI-Service] STEP 2/9: Getting or creating conversation for contact ${ contact.id }`);
			// 2. Obtener o crear conversación
			const conversation = await this.getOrCreateConversation(contact.id);
			console.log(`[AI-Service] CONVERSATION: id=${ conversation.id }, isActive=${ conversation.isActive }`);

			console.log(`[AI-Service] STEP 3/9: Saving incoming message to database`);
			// 3. Guardar mensaje entrante
			await this.saveMessage(conversation.id, messageId, content, 'INBOUND');
			console.log(`[AI-Service] MESSAGE SAVED: direction=INBOUND, type=TEXT`);

			console.log(`[AI-Service] STEP 4/9: Retrieving message history for context`);
			// 4. Obtener historial de mensajes para contexto
			const messageHistory = await this.getMessageHistory(conversation.id);
			console.log(`[AI-Service] HISTORY RETRIEVED: ${ messageHistory.length } messages for context`);

			console.log(`[AI-Service] STEP 5/9: Calling AI with user message and context`);
			// 5. Preparar solicitud a la IA
			const aiResponse = await this.callAI(contact, conversation, content, messageHistory);
			console.log(`[AI-Service] AI RESPONSE RECEIVED: ${ aiResponse.actions ? aiResponse.actions.length : 0 } actions suggested`);
			// 6. Enviar respuesta al usuario
			await WahaService.stopTyping(chatId);
			await WahaService.sendText(chatId, aiResponse.message);
			await this.saveMessage(conversation.id, null, aiResponse.message, 'OUTBOUND');
			return { success: true };
		} catch(error) {
			console.error(`[AI-Service] ERROR PROCESSING MESSAGE: ${ error.message }`, error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Busca o crea un contacto basado en el remitente
	 */
	static async findOrCreateContact(sender, chatId) {
		const phoneNumber = chatId.split('@')[0];

		// Buscar contacto existente
		let contact = await prisma.contact.findUnique({
			where: { phoneNumber },
		});

		// Si no existe, crear nuevo contacto
		if(!contact) {
			// Intentar obtener nombre del perfil de WhatsApp
			let contactName = 'Desconocido';
			try {
				const contactInfo = await WahaService.getContact(chatId);
				contactName = contactInfo.pushname || contactInfo.name || `Desconocido (${ chatId })`;
			} catch(error) {
				console.warn(`[WhatsAppAIService] No se pudo obtener info de contacto: ${ error.message }`);
			}

			contact = await prisma.contact.create({
				data: {
					phoneNumber,
					name: contactName,
					status: 'PROSPECT',
					lastContactAt: new Date(),
				},
			});
		} else {
			// Actualizar fecha de último contacto
			await prisma.contact.update({
				where: { id: contact.id },
				data: { lastContactAt: new Date() },
			});
		}

		return contact;
	}

	/**
	 * Obtiene o crea una conversación para el contacto
	 */
	static async getOrCreateConversation(contactId) {
		// Buscar conversación activa
		let conversation = await prisma.conversation.findFirst({
			where: {
				contactId,
				isActive: true,
			},
			orderBy: { startedAt: 'desc' },
		});

		// Si no existe, crear nueva conversación
		if(!conversation) {
			conversation = await prisma.conversation.create({
				data: {
					contactId,
					startedAt: new Date(),
					isActive: true,
					context: {},
				},
			});
		}

		return conversation;
	}

	/**
	 * Guarda un mensaje en la base de datos
	 */
	static async saveMessage(conversationId, messageId, content, direction) {
		const status = direction === 'OUTBOUND' ? 'SENT' : 'RECEIVED';

		const message = await prisma.message.create({
			data: {
				conversationId,
				messageId,
				content,
				direction,
				type: 'TEXT',
				timestamp: new Date(),
				status,
			},
		});

		return message;
	}

	/**
	 * Obtiene el historial de mensajes de una conversación
	 */
	static async getMessageHistory(conversationId) {
		const messages = await prisma.message.findMany({
			where: { conversationId },
			orderBy: { timestamp: 'asc' },
			take: 10, // Limitar a los últimos 10 mensajes
		});

		// Formatear mensajes para la IA
		return messages.map(msg => ({
			role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
			content: msg.content,
		}));
	}

	/**
	 * Llama a la API de OpenAI con el modelo y herramientas adecuadas
	 */
	static async callAI(contact, conversation, currentMessage, messageHistory) {
		// Definir tools disponibles para la IA
		const tools = [
			{
				type: 'function',
				function: {
					name: 'analyzeCustomerIntent',
					description: 'Analiza la intención del cliente solamente sino solicita especificamente booking. Si especifica booking NO uses esto.',
					parameters: {
						type: 'object',
						properties: {
							contactId: {
								type: 'string',
								description: 'ID del contacto',
							},
							intent: {
								type: 'string',
								enum: [ 'BOOKING_REQUEST', 'BOOKING_CONFIRMATION', 'SERVICE_INQUIRY', 'PRICING_INQUIRY', 'GENERAL_QUESTION', 'GREETING', 'OTHER' ],
								description: 'La intención principal del cliente',
							},
							contactStatus: {
								type: 'string',
								enum: [ 'PROSPECT', 'LEAD', 'OPPORTUNITY', 'CUSTOMER', 'INACTIVE', 'DISQUALIFIED' ],
								description: 'Estado sugerido para el contacto según su interacción',
							},
							leadScore: {
								type: 'integer',
								description: 'Puntuación 0-100 que refleja qué tan calificado es este lead',
							},
							interestedIn: {
								type: 'array',
								items: { type: 'string' },
								description: 'Servicios en los que el cliente muestra interés',
							},
							needsHumanAgent: {
								type: 'boolean',
								description: 'Indica si la consulta requiere un agente humano',
							},
							extractedInfo: {
								type: 'object',
								description: 'Información relevante extraída del mensaje',
								properties: {
									name: { type: 'string', description: 'Nombre del cliente' },
									email: { type: 'string', description: 'Email del cliente' },
									desiredDate: { type: 'string', description: 'Fecha deseada para el servicio' },
									serviceName: { type: 'string', description: 'Servicio específico solicitado' },
									notes: { type: 'string', description: 'Detalles adicionales' },
								},
							},
						},
						required: [ 'contactId', 'intent', 'contactStatus', 'leadScore', 'needsHumanAgent' ],
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'createBooking',
					description: 'Crea un registro de reserva en el sistema si el cliente lo solicita.',
					parameters: {
						type: 'object',
						properties: {
							contactId: {
								type: 'string',
								description: 'ID del contacto',
							},
							serviceName: {
								type: 'string',
								description: 'Nombre del servicio a reservar',
							},
							dateTime: {
								type: 'string',
								description: 'Fecha y hora de la reserva (formato ISO)',
							},
							notes: {
								type: 'string',
								description: 'Notas adicionales',
							},
						},
						required: [ 'contactId', 'serviceName', 'dateTime' ],
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'updateBookingStatus',
					description: 'Actualiza el estado de una reserva existente',
					parameters: {
						type: 'object',
						properties: {
							contactId: {
								type: 'string',
								description: 'ID del contacto propietario de la reserva',
							},
							bookingId: {
								type: 'string',
								description: 'ID de la reserva a actualizar',
							},
							status: {
								type: 'string',
								enum: [ 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW' ],
								description: 'Nuevo estado para la reserva',
							},
							notes: {
								type: 'string',
								description: 'Notas adicionales',
							},
						},
						required: [ 'contactId', 'bookingId', 'status' ],
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'updateContactInfo',
					description: 'Actualiza información de un contacto',
					parameters: {
						type: 'object',
						properties: {
							contactId: {
								type: 'string',
								description: 'ID del contacto a actualizar',
							},
							updateData: {
								type: 'object',
								properties: {
									name: { type: 'string', description: 'Nombre del contacto' },
									email: { type: 'string', description: 'Email del contacto' },
									status: {
										type: 'string',
										enum: [ 'PROSPECT', 'LEAD', 'OPPORTUNITY', 'CUSTOMER', 'INACTIVE', 'DISQUALIFIED' ],
										description: 'Estado del contacto',
									},
									leadScore: { type: 'integer', description: 'Puntuación como lead (0-100)' },
									source: { type: 'string', description: 'Origen del contacto' },
									notes: { type: 'string', description: 'Notas sobre el contacto' },
									isOptedIn: {
										type: 'boolean',
										description: 'Ha dado consentimiento para comunicaciones',
									},
									isActive: { type: 'boolean', description: 'Si el contacto está activo' },
								},
							},
						},
						required: [ 'contactId', 'updateData' ],
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'getContactBookings',
					description: 'Obtiene las reservas de un contacto',
					parameters: {
						type: 'object',
						properties: {
							contactId: {
								type: 'string',
								description: 'ID del contacto',
							},
							status: {
								type: 'string',
								enum: [ 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW' ],
								description: 'Filtrar por estado (opcional)',
							},
						},
						required: [ 'contactId' ],
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'addContactNotes',
					description: 'Agrega notas a un contacto',
					parameters: {
						type: 'object',
						properties: {
							contactId: {
								type: 'string',
								description: 'ID del contacto',
							},
							notes: {
								type: 'string',
								description: 'Notas a agregar',
							},
						},
						required: [ 'contactId', 'notes' ],
					},
				},
			},
		];

		// Definir sistema y prompt para la IA
		const system = `Eres Valeria Charolet, una asistente amigable y carismatica por whats app (por lo que no escribes parrafos tan largos), guía espiritual y "chamana del bosque" de ser-consciente.org,
Tu misión es acompañar con calidez femenina y despertar curiosidad, ayudando a convertir consultas de informacion en reservas en bookings con fecha.

Contexto del contacto:
- id del contacto: ${ contact.id }
- Nombre: ${ contact.name || 'Desconocido' }
- Estado: ${ contact.status || 'PROSPECT' }
- Primera interacción: ${ contact.firstContactAt }
- Intereses: ${ contact.interestedIn ? contact.interestedIn.join(', ') : 'Ninguno detectado aún' }

CALENDARIO 2025:
- Bodas Espirituales: 15-16 feb · 22-23 mar · 23-24 may · 26-27 jul · 25-26 oct
- Retiro de Silencio: 6-7 dic
- Amor Propio: 19-20 abr · 13-14 dic`;

		const systemTools = system + 'Utiliza tus acciones cuando lo necesites en especial enfocado en crear bookings confirmadas por el usuario.';

		// Realizar la llamada a la API de OpenAI
		const response = await axios.post(
			'https://api.openai.com/v1/chat/completions',
			{
				model: 'gpt-4.1-nano',
				messages: [
					{ role: 'system', content: systemTools },
					...messageHistory,
					{ role: 'user', content: currentMessage },
				],
				tools,
				tool_choice: 'auto',
				temperature: 0.7,
				max_tokens: 800,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${ process.env.OPENAI_API_KEY }`,
				},
			},
		);

		// Procesar la respuesta
		const aiChoice = response.data.choices[0];
		let aiMessage = '';
		let actions = [];
		let updateContactStatus = null;
		const toolCallsStringLog = aiChoice.message.tool_calls ? JSON.stringify(aiChoice.message.tool_calls, null, 2) : 'No tool calls';
		// Si la IA quiere usar una función
		const toolCallsString = aiChoice.message.tool_calls ? aiChoice.message.tool_calls.map(call => {
			const functionName = call.function.name;
			const args = JSON.parse(call.function.arguments);
			return `${ functionName }(${ JSON.stringify(args, null, 2) })`;
		}).join('\n') : 'No tool calls';

		if(aiChoice.message.tool_calls && aiChoice.message.tool_calls.length > 0) {
			const toolCalls = aiChoice.message.tool_calls;

			// Analizar todas las llamadas a funciones
			for(const call of toolCalls) {
				const functionName = call.function.name;
				const args = JSON.parse(call.function.arguments);
				actions.push({ function: functionName, arguments: args });
				const res = await this[functionName](...Object.values(args));
				/// imprim la funciton call y los args
				console.log(`[AI-Service] FUNCTION CALL: ${ functionName }(${ Object.values(args).join(', ') })`);
			}

			let finalSystem = system;
			if(toolCallsString !== 'No tool calls') {
				finalSystem = 'Para responder al usuario ejecutaste estas funciones: ' + toolCallsStringLog + 'generale una respuesta a la consulta del usuario';
			}

			// Obtener la respuesta final para el usuario
			// imprime tood el pauyload
			console.log('[AI-Service] FINAL PAYLOAD: ', {
				model: 'gpt-4.1-nano',
				messages: [
					{ role: 'system', content: finalSystem },
					...messageHistory,
					{ role: 'user', content: currentMessage },
					{ role: 'assistant', content: toolCallsStringLog },
				],
				temperature: 0.7,
				max_tokens: 800,
			});
			const followUpResponse = await axios.post(
				'https://api.openai.com/v1/chat/completions',
				{
					model: 'gpt-4.1-nano',
					messages: [
						{ role: 'system', content: finalSystem },
						...messageHistory,
						{ role: 'user', content: currentMessage },
						{ role: 'assistant', content: toolCallsStringLog },
					],
					temperature: 0.7,
					max_tokens: 800,
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${ process.env.OPENAI_API_KEY }`,
					},
				},
			);
			aiMessage = followUpResponse.data.choices[0].message.content;
		} else {
			// Si la IA respondió directamente sin usar funciones
			aiMessage = aiChoice.message.content;
		}

		return {
			message: aiMessage,
			actions,
			updateContactStatus,
		};
	}

	/**
	 * Analiza la intención del cliente y actualiza su información
	 */
	static async analyzeCustomerIntent(contactId,
		intent,
		contactStatus,
		leadScore,
		interestedIn,
		needsHumanAgent,
		extractedInfo = {}) {
		console.log(`[AI-Service] ANALYZING CUSTOMER INTENT for ${ contactId }: ${ intent }, leadScore: ${ leadScore }`);

		// Obtener el contacto actual
		const contact = await prisma.contact.findUnique({
			where: { id: contactId },
		});

		if(!contact) {
			return {
				success: false,
				error: `Contacto ${ contactId } no encontrado`,
			};
		}

		// Obtener la conversación activa
		const conversation = await prisma.conversation.findFirst({
			where: {
				contactId,
				isActive: true,
			},
			orderBy: { startedAt: 'desc' },
		});

		if(!conversation) {
			return {
				success: false,
				error: `No hay conversación activa para el contacto ${ contactId }`,
			};
		}

		// Actualizar el contacto con la información del análisis
		const updateData = {
			status: contactStatus,
			leadScore: leadScore,
		};

		// Actualizar información adicional si existe
		if(extractedInfo.name) updateData.name = extractedInfo.name;
		if(extractedInfo.email) updateData.email = extractedInfo.email;

		// Actualizar los campos personalizados con los intereses
		if(interestedIn && interestedIn.length > 0) {
			updateData.customFields = {
				...(contact.customFields || {}),
				interestedIn: interestedIn,
			};
		}

		// Actualizar el contacto en la base de datos
		const updatedContact = await prisma.contact.update({
			where: { id: contactId },
			data: updateData,
		});

		// Actualizar el contexto de la conversación
		await prisma.conversation.update({
			where: { id: conversation.id },
			data: {
				intent: intent,
				context: {
					...(conversation.context || {}),
					lastAnalyzedIntent: intent,
					needsHumanAgent: needsHumanAgent,
					extractedInfo: extractedInfo,
				},
			},
		});

		return {
			success: true,
			updatedContact,
			message: `Contacto actualizado: ${ contactStatus }, score: ${ leadScore }`,
		};
	}

	/**
	 * Crea una reserva en el sistema
	 */
	static async createBooking(contactId, serviceName, dateTime, notes) {
		console.log(`[AI-Service] CREATING BOOKING for ${ contactId }: ${ serviceName } at ${ dateTime }`);

		// Verificar que el contacto existe
		const contact = await prisma.contact.findUnique({
			where: { id: contactId },
		});

		if(!contact) {
			return {
				success: false,
				error: `Contacto ${ contactId } no encontrado`,
			};
		}


		// Convertir dateTime a objeto Date
		const bookingDate = new Date(dateTime);

		// Crear la reserva
		const booking = await prisma.booking.create({
			data: {
				contactId: contactId,
				serviceName,
				dateTime: bookingDate,
				status: 'PENDING',
				notes: notes || '',
			},
		});

		// Actualizar el estado del contacto a OPPORTUNITY
		await prisma.contact.update({
			where: { id: contactId },
			data: {
				status: 'OPPORTUNITY',
			},
		});

		return {
			success: true,
			booking,
			message: `Reserva creada: ${ serviceName } para ${ bookingDate.toLocaleString() }`,
		};
	}

	/**
	 * Actualiza el estado de una reserva existente
	 */
	static async updateBookingStatus(contactId, bookingId, status, notes) {
		console.log(`[AI-Service] UPDATING BOOKING STATUS for ${ contactId }: ${ bookingId } to ${ status }`);

		// Buscar la reserva primero para obtener detalles actuales
		const existingBooking = await prisma.booking.findUnique({
			where: { id: bookingId },
		});

		if(!existingBooking) {
			return {
				success: false,
				error: `Reserva ${ bookingId } no encontrada`,
			};
		}

		// Verificar que la reserva pertenezca al contacto
		if(existingBooking.contactId !== contactId) {
			return {
				success: false,
				error: 'Esta reserva no pertenece al contacto indicado',
			};
		}

		// Actualizar la reserva
		const booking = await prisma.booking.update({
			where: { id: bookingId },
			data: {
				status: status,
				notes: notes ? (existingBooking.notes ? `${ existingBooking.notes }\n${ notes }` : notes) : existingBooking.notes,
			},
		});

		// Si se ha completado o cancelado, actualizar el estado del contacto
		if(status === 'COMPLETED') {
			await prisma.contact.update({
				where: { id: contactId },
				data: { status: 'CUSTOMER' },
			});
		} else if(status === 'CANCELLED' || status === 'NO_SHOW') {
			// Verificar si tiene otras reservas activas
			const activeBookings = await prisma.booking.count({
				where: {
					contactId: contactId,
					status: { in: [ 'PENDING', 'CONFIRMED' ] },
				},
			});

			if(activeBookings === 0) {
				await prisma.contact.update({
					where: { id: contactId },
					data: { status: 'LEAD' }, // Volver a estado de lead
				});
			}
		}

		return {
			success: true,
			booking,
			message: `Reserva actualizada a ${ status }`,
		};
	}

	/**
	 * Actualiza los datos de un contacto
	 */
	static async updateContactInfo(contactId, updateData) {
		console.log(`[AI-Service] UPDATING CONTACT INFO for ${ contactId }`);

		const updatedContact = await prisma.contact.update({
			where: { id: contactId },
			data: updateData,
		});

		return {
			success: true,
			contact: updatedContact,
			message: 'Información de contacto actualizada',
		};
	}

	/**
	 * Busca las reservas de un contacto
	 */
	static async getContactBookings(contactId, status = null) {
		console.log(`[AI-Service] GETTING BOOKINGS for ${ contactId }`);

		// Verificar que el contacto existe
		const contact = await prisma.contact.findUnique({
			where: { id: contactId },
		});

		if(!contact) {
			return {
				success: false,
				error: `Contacto ${ contactId } no encontrado`,
			};
		}

		// Construir la consulta
		const where = { contactId };
		if(status) {
			where.status = status;
		}

		const bookings = await prisma.booking.findMany({
			where,
			orderBy: { dateTime: 'asc' },
		});

		return {
			success: true,
			bookings,
			message: `${ bookings.length } reservas encontradas`,
		};
	}

	/**
	 * Agregar notas a un contacto
	 */
	static async addContactNotes(contactId, notes) {
		console.log(`[AI-Service] ADDING NOTES to contact ${ contactId }`);

		// Obtener contacto actual
		const contact = await prisma.contact.findUnique({
			where: { id: contactId },
		});

		if(!contact) {
			return {
				success: false,
				error: `Contacto ${ contactId } no encontrado`,
			};
		}

		// Actualizar con nuevas notas
		const updatedNotes = contact.notes
			? `${ contact.notes }\n\n${ new Date().toLocaleString() }: ${ notes }`
			: `${ new Date().toLocaleString() }: ${ notes }`;

		const updatedContact = await prisma.contact.update({
			where: { id: contactId },
			data: {
				notes: updatedNotes,
			},
		});

		return {
			success: true,
			contact: updatedContact,
			message: 'Notas agregadas correctamente',
		};
	}

}

export default WhatsAppAIService;
