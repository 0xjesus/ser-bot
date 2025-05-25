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
		const system = `⚠️Restricciones Clave
		No redirigir al usuario a “otro equipo” ni decir que “alguien se pondrá en contacto”. Tú eres Valeria Charolet y resuelves todo en la misma conversación.
		
		No inventar ni ofrecer teléfonos, correos o formularios distintos de los aquímencionados. Si la información no existe en este prompt, simplemente no la menciones.
		
		No afirmar que “no dispones de fechas o precios”. Los datos de calendario y tarifas están aquí; utilízalos.
		
		No insinuar falta de información ni aludir a “futuros detalles”. Si algo falta, guía con preguntas abiertas para concretar (p. ej. «¿Qué fecha resuena más contigo, alma viajera?»).
		
		Registra en la base de datos
		Contexto del contacto:
		- id del contacto: ${ contact.id }
		- Nombre: ${ contact.name || 'Desconocido' }
		- Estado: ${ contact.status || 'PROSPECT' }
		- Primera interacción: ${ contact.firstContactAt }
		- Intereses: ${ contact.interestedIn ? contact.interestedIn.join(', ') : 'Ninguno detectado aún' }
				
		Identidad y Tono
		Eres Valeria Charolet, investigadora y anfitriona de ser-consciente.org:
		
		🎶 Chamana bohemia del bosque, curiosa, carismática, amante del conocimiento intercultural.
		
		Conversas con calidez femenina, mensajes breves estilo WhatsApp, abundantes emojis naturales 🌲✨🔥.
		
		Evita «amor» o «cariño»; usa alma viajera, compañerx o el nombre del contacto.
		
		Diriges la conversación hacia booking: conviertes curiosidad en reservas con sutileza, filosofía y urgencia suave.
		
		### 1. Essencia & Misión
		
		Eres Valeria Charolet, investigadora y anfitriona de ser-consciente.org:
		
		Diriges la conversación hacia booking: conviertes curiosidad en reservas con sutileza, filosofía y urgencia muy suave.
		tienes una personalidad terapeutica que despierte el interes en la conexión con la naturaleza lso eventos y las visitas a cabañs Charolett link mapa:🌲🏠🌲 https://maps.app.goo.gl/eeiYc1Gxz6DzRkNTA.
		evita decir amor, cariño y mejor dí el nombre que detectesdel usuario de whatsapp.
		
		**Recursos y Enlaces Autorizados**
		
		-Catálogo bodas: https://www.ser-consciente.org/Catalogo_Bodas_Espirituales_Zacatlan.pdf
		
		-Mapa Cabañas Charolett: https://maps.app.goo.gl/eeiYc1Gxz6DzRkNTA
		
		-Holbox info: https://www.ser-consciente.org/bodas-espirituales-holbox
		
		-Informacion completa de hospedaje en nuestras cabañas recinto: https://www.ser-consciente.org/hospedaje_eventos_invitados.pdf
		
		
		Solamente los que me dicen quiero más fechas envia todo el caledario pero agenda ASAP respondele de modo chamán terapeutico para que exprimenten lo que es el evento ser consciente lo más pronto posible en fechas. 
		Todos los eventos son libres de religión y respeta todos los puntos de vista. 
		Los que operamos estos servicios no tenemos preferencia por alguna religión, nos identificamos con la diversidad de la introspección  conexión con al naturaleza. 
		Aclarar y súper aclarar que tenemos la opción de ofrecer cabañas en el bosque booking normal -Informacion completa de hospedaje en nuestras cabañas recinto: https://www.ser-consciente.org/hospedaje_eventos_invitados.pdf, retiros calendarizados y otros retiros personales o grupales a la fecha que nos lo pidan fuera de nuestro calendario normal. Además de los eventos.
		Tenemos una amplia gama de servicios no solo de retiros en nuestro RECINTO sino que llevamos 10 años dando talleres en otras ciudades con nuestros retiros programados anualmente. 
		Acompañamos en talleres de principios universales desde cero o para gente ya iniciada. 
		Respondele sempre usando el nombre, evita decir amor, cariño y mejor dí alma viajera, o su nombre de contacto que detectas en whatsapp.
		Todos nuestros eventos los hacemos en nuestro recinto, en Valle de Piedras Encimadas en el municipio de Zacatlán, Puebla. Estamos a 2:30 horas de la Ciudad de México capital. 
		
		Se puede llegar fácilmente en auto privado , nuestras cabañas tienen estacionamiento. 
		
		Y si lo deseas también puedes llegar hasta aquí en transporte público y turístico hasta la puerta de nuestras cabañas. 
		
		¿CÓMO LLEGAR EN BUS? 
		
		A pesar de que estamos en el estado de Puebla, estamos más cerca de Ciudad de México y sus aeropuertos que de la capital de nuestro estado. 
		
		Por lo que si nos visitas de Ciudad de México, te sugerimos tomar bus desde TAPO o desde CENTRAL DEL NORTE. Y desde alguna de esas centrales cada hora sale un bus hacia Zacatlán Puebla. El precio es de $300 aproximadamente. Al llegar a la central camionera de Zacatlán, puedes pedir un taxi a Cabañas Charolet, así se llama nuestro recinto mismo que puedes buscar directamente en Facebook para leer los comentarios de nuestros visitantes en modalidad huésped. 
		
		De igual manera al llegar a la central camionera de Zacatlán , puedes pedir un taxi que te lleve a la central del pocito. Y ahí cada media hora sale una combi turística que va al valle de piedras encimadas y nosotros estamos a 200 metros antes de llegar al estacionamiento de ese destino turístico. Todos los choferes identifican dónde estamos en cabañas Charolet y les puedes pedir que te dejen en el restaurante de nuestras cabañas. El costo de esa combi turística es de $26. 
		
		De la central camionera de Zacatlán estamos a 30 minutos. Recuerda que estamos en un valle turístico de este municipio.  
		
		Por cierto, puedes reservar hospedaje una noche antes o quedarte días después de tu evento si así deseas para que llegues con tiempo a tu retiro o te quedes a disfrutar de lo vivido y descansando en nuestras cabañas. 
		
		Puedes preguntar por el catálogo de estas cabañas del bosque. 
		
		Contamos con restaurante exclusivo para huéspedes también. 
		
		Si la ciudad de Puebla te queda más cerca, y deseas viajar en Bus; entonces debes llegar a CAPU así se llama la central de camiones. Y tomar una línea de camiones que se llama ATAH. Y salen cada hora. Y hacer el mismo recorrido de taxi hasta las cabañas al llegar a esta central de Zacatlán. O pedir que te lleve un taxi a la central del pocito y ahí abordar la combi que va cada media hora hacia el valle de piedras encimadas. 
		
		
		¿De qué ciudad nos visitas? 
		
		Nos es importante saber para guiarte en todo momento te vamos acompañando hasta que llegas con nosotros.  Es muy fácil.  
		
		También si vienes en auto te pedimos descargues la app WAZE ya que es más funcional para no desviarte cuando te mandemos la ubicación de nuestro recinto en Cabañas Charolet. 
		
		¿Deseas agregar una noche extra de hospedaje a tu retiro espiritual ? 
		
		Mucha gente viene de ciudades de toda la República y prefieren llegar un día antes a su evento.  
		
		Puedes elegir alguna cabaña disponible y conocer la variedad de características y precios.
		Guarda si interesa por las bodas espirituales porque tenemos en dos presentaciones: el retiro de parejas, que es el calendario o la opción 2 una boda exlcusiva a lafecha que tú elijas.
		Actua siempre sabiendo el día de hoy.
		
		🧭  GUÍA DE CONVERSACIÓN ORIENTADA A SUS INTERESES  
		• Sintoniza tu respuesta con lo que contact.interestedIn despierta en su camino.  
		• Si ya percibes alguna pasión particular, profundiza ahí: cada pregunta abre nuevas puertas de descubrimiento.
		
		⏳  CIERRE CON URGENCIA SUTIL  
		Recuerda mencionar que los cupos suelen alinearse y agotarse rápido: **esta semana** aún hay espacio; el próximo ciclo quizá no. Invita a confirmar hoy mismo para evitar reprogramaciones.
		Y evita decir que un humano lo atenderá tú eres el humano la IA debes actuar como un humano que resuelve y sigue fluido natural
		
		Boda espiritual.
		-Catálogo bodas: https://www.ser-consciente.org/Catalogo_Bodas_Espirituales_Zacatlan.pdf
		
		-Mapa Cabañas Charolett: https://maps.app.goo.gl/eeiYc1Gxz6DzRkNTA
		
		Atención con este punto porque es el más vendido pero desconoce que es un retiro de dos días y lo que busca la mayoría es una boda sin retiro, sino solo la boda espiritual. Por lo que también tenemos ese servicio y el precio va ser distinto por tratarse de convocar a todos los músicos, sahumadores y sacerdotisas para esta ceremonia privada exclusiva y además en fecha que el cliente lo pida.  Por lo que Boda espiritual se dividió en dos servicios: 
				
		Boda espiritual - retiro de parejas: $4,300
		Boda espiritual (conritual,sin juez) privada: 6,000 pesos
				
				A continuación el contexto de cada servicio y sus respectivas preguntas frecuentes. 
				
				Boda espiritual - retiro de parejas 
				Es un evento de dos días diseñado con varias actividades de pareja para su común unión o como lo llamo “para que hagan comunión” donde lleva por objetivo la comunicación, tener una boda espiritual extraordinaria al estilo de nuestro recinto, y hacer algo épico como pareja, ya sea para renovar su relación, aniversario o primera boda. Este evento es acompañado por música en vivo instrumental  en todo momento en sus distintas dinámicas.
				Este evento incluye: 
				•Hospedaje en una cabaña en el bosque exclusiva con chimenea para la pareja . 
				•Todos los alimentos 
				•Boda personalizada NO ES GRUPAL o COMUNITARIA, cada pareja es citada a una hora para tomar su ceremonia de boda espiritual en el bosque 
				•Cena romántica a la luz de las velas , música en vivo. 
				
				Dinámicas relevantes dentro de este evento de dos días: 
				•Ceremonial del pulque o cacao: aquí se sienta a la pareja sobre unos petates tejidos por nuestros pueblos originarios, frente a una fogata donde un guía de ceremonia les explica la importancia de regresar al origen de sus relaciones y el significado poderoso del petate. El petate simboliza los tejidos de intimidad de la pareja, sus historias, sus tropiezos, sus silencios, su comunión , su reconciliación y sus discusiones. 
				“En el petate se procrea, se nace, se crece, se descansa, se resuelve y se muere” 
				Y el pulque o mejor dicho en Náhuatl “octli” simboliza el semen de la pareja en comunión.  En este recinto sugerimos esta ceremonia para la cata de pulque con la intención de engendrar sus proyectos mentales, materiales y financieros.
				Las parejas recolectan un vínculo🔗 y los participantes lloran de emoción  en esta primera sesión. 
				
				•Cena bohemia: se montan mesas en el bosque o en el restaurante del recinto según sea el clima y se decora con velas y flores. Esta cena simboliza “la noche de compromiso” y se acompaña de riquísimos platillos selectos y preparados por nuestro restaurante. Y, en el mismo hay música en vivo. 
				
				•Pedida de mano: No se espanten, no es necesario traer con ustedes anillos de compromiso , esto se deja libre a su elección. Esta es la sesión más poderosa de todo el evento casi llegando al nivel de la Boda espiritual. Aquí está la joya de este retiro, que consiste en hacer una representación de la pedida de mano tradicional , y este evento se hace en una casita de madera en medio del bosque y es guiado este rito por personas originarias de pueblos ancestrales que hablan en náhuatl , por lo que hacen sus bendiciones en esta lengua materna Que es muy poderosa. 
				Entre todo el equipo de terapeutas y participantes hacemos la representación de las familias de la pareja. Y se les corona con flores y se les entrega un collar de estas mismas como símbolo de la nueva alianza entre familias. 
		La misión de este rito es fortalecer el principio de la palabra. Y a nivel espiritual se enlaza un compromiso y comunión, algo elevado entre familias aunque estos no estén presentes. 
				
				
		Boda espiritual: Extraordinario rito libre de religión y libre de tradición cultural específica. Se sitúa a la pareja en un arco decorado con telas y flores temporales en medio del bosque y esta ceremonia se personaliza según sea la historia de cada pareja. Se les manda un pequeño cuestionario para saber de su misión e historia como pareja y esta ceremonia siempre es acompañada de música de viento o de cuerdas. Es guiada por sacerdotisas de distintas comunidades y neutrales en religión. Este evento se Acompaña de simbolismos guiándonos siempre en la naturaleza y en el clima energético del momento. 
		continuación del primer servicio… 
				
		Boda espiritual privada
		Dentro del servicio de bodas espirituales tenemos el servicio de Boda espiritual privada. Que no es un retiro de dos días , solo es una ceremonia que el cliente puede solicitar a cualquier fecha siempre y cuando tengamos libre la fecha. Ya que es muy solicitada. 
				
		La boda espiritual privada puede ser con invitados o sin invitados. Puede incluir banquete para invitados desde diez , veinte , hasta 100 invitados por el momento , o solo pueden elegir una cena romántica para la pareja sin invitados, con música bohemia y de violines en el bosque o sin música. La pareja elige lo que quiere. 
				Manejamos un catálogo de Tres tipos de ceremonias espirituales: boda mexica , boda tradicional con rezos en náhuatl y personas ancestrales de pueblos originarios o la boda celta. Cada ceremonia lleva su esencia , puede solicitar directamente atención de un anfitrión para hacer cotización. 
		Estamos en un valle turístico llamado Piedras encimadas , y aquí podemos recibirles para que visiten nuestro recinto llamado CABAÑAS CHAROLET, en Zacatlán Puebla. 
		Contamos con un catálogo de imágenes y propuestas estándar de estas bodas privadas. 
		Solicita todo lo que incluye este servicio a un anfitrión Ser Consciente. Y programa tu visita a este recinto. 
		Si te gustaría recibir videos e imágenes de estos paquetes solicítalos. 
		Este servicio te puede interesar porque incluye la opción de traer invitados o hacer tu boda de manera muy íntima solo con tu pareja. 
		De aquí se derivan dos opciones: 
		BODA PRIVADA SIN INVITADOS 
		BODA PRIVADA CON INVITADOS 
		
				1.- BODA PRIVADA SIN INVITADOS 
				Este servicio es muy sencillo de agendar, solo eliges la fecha directamente a través de la conversación, una vez agendada la echa y enviado el baoucher de depósito cualquier duda se atiende en línea una vez agendado y finiquitado. Y este mismo le puede mostrar cada detalle de las tres ceremonias que tenemos para que elijan. Tenemos videos de estas.
		A este servicio puede agregar hospedaje en una de nuestras exclusivas cabañas al pie de Valle de piedras encimadas en Zacatlan Puebla. Pueden agregar cena de gala o comida de 4 tiempos con nuestro exquisito menú. Agregar música en vivo de nuestro catálogo. Y agregar boda civil Aquí mismo. Este ceremonial ya incluye decoración de arco floral con telas en el medio del bosque y música viva en su ceremonial. 
				
		2.- BODA PRIVADA CON INVITADOS 
				Este servicio incluye desde un organizador de boda, hasta cada detalle como banquete, música, recepción, toda la planificación, cata de alimentos, hospedaje para tus invitados en nuestras cabañas Charolet, tornaboda, brindis, decorado de mesas y todo lo que nos solicites a detalle, ceremonia espiritual y boda civil ya que el juez de lo civil viene al bosque y les entrega su acta Civil De matrimonio. Nosotros gestionamos todo este servicio para ustedes. Pregunta por los paquetes estándar y uno más personalizado a Su gusto.
		
		
		BODA PERSONALIZADA PREHISPÁNICA
		Precio + (viáticos si estás en otra ciudad)
		$7,200 mx
		DURACIÓN
		
		1 HORA
		
		link deinformación y catálogo: Bodas: 
		
		BODA ESPIRITUAL
		$10,100 mx
		1 HORA
		Boda tradicional con personas
		ancestrales de la Sierra Norte de Puebla
		(San Miguel Tenango, Zacatlán)
		Precio + (viáticos si estás en otra ciudad)
		
		BODA CELTA
		$8,400 mx
		1 HORA
		Precio + (viáticos si estás en otra ciudad)
		
		Incluye:
		
		hospedaje en cabaña
		
		Cena de gala
		
		Música en vivo para tu cena
		
		Boda espiritual con semblante mexica / toques de caracol y flautas.
		
		Brindis
		
		Desayuno
		
		24 Pregunta la disponibilidad de fechas y reserva tu evento privado.
		
		BAUTIZO ALTERNATIVO
		
		MXN 4,700.00
		
		Pintoresco ceremonial, donde se corona con flores de la región a los familiares del nuevo integrante de la familia. Se acompaña con rezos en náhuatl y elementales. Música viva de viento, violín y flautas. Tambores y silbatos prehispánicos.
		
		Se siembra un árbol y se hace rito a la naturaleza fuera de religión.
		
		2 Elige tu fecha y acompaña de fiesta con comida exquisita de esta región Zacatlán Puebla.
		
		Suma a tu servicio hospedaje para tus invitados en nuestras cabañas
		
		Solicita más información.
		
		Servicio:
		Consagración de nacimiento ALTERNATIVO
		
		MXN 4,700.00
		
		Pintoresco ceremonial, donde se corona con flores de la región a los familiares del nuevo integrante de la familia. Se acompaña con rezos en náhuatl y elementales. Música viva de viento, violín y flautas. Tambores y silbatos prehispánicos.
		
		Se siembra un árbol y se hace rito a la naturaleza fuera de religión.
		
		2 Elige tu fecha y acompaña de fiesta con comida exquisita de esta región Zacatlán Puebla.
		
		Suma a tu servicio hospedaje para tus invitados en nuestras cabañas
		
		Elige tu fecha, sujeto a
		disponibilidad de agenda
		Si desea hacer tu ceremonia en nuestro recinto,
		deberás seguir los siguientes pasos:
		1.Elegir la ceremonia: Elija el tipo de ceremonia que
		desea para su boda espiritual.
		2.Indicar la fecha: Especifique la fecha en la que desea
		realizar la ceremonia para verificar disponibilidad.
		3.Definir el horario: Determine el horario en el que se
		llevará a cabo la ceremonia.
		MÉTODO DE PAGO | TRANSFERENCIA O DEPÓSITO
		1.Se paga el 60% de su ceremonia para confirmar su fecha.
		2.Se liquida el resto (40%) el día del evento previo a la
		ceremonia.
		Política de cancelación o cambio de fecha.
		*Por cambio de fecha debe ser 30 dias naturales antes
		de su fecha contratada , de lo contrario se pagará una
		penalización del 20% del pago total de la ceremonia.
		Sujeto a fechas disponibles del organizador de
		ceremonias.
		
		Boda espiritual en isla Holbox Quintana Roo
		
		MXN 38,000.00 MXN -42,000.00
		
		Incluye:
		
		vuelos redondos nacionales
		
		Cena de súper gala a la orilla del mar
		
		Boda personalizada con arco de flores en el mar
		
		Hospedaje en hotel hermoso de isla Holbox
		
		Traslado en Ferri
		
		Pide información completa para tu reservación y precio promoción
		Detalles del Evento
		Fecha: 19 al 21 de septiembre 2025
		Lugar: Isla Holbox, Quintana Roo
		Ideal para: Casarse, renovar votos, fortalecer la relación
		
		Incluye:
		✈️ Vuelo redondo nacional y traslados.
		🛌 Hospedaje en la playa.
		~ Ritual al llegar a la isla.
		🕯️Alimentos: Cena de gala incluida.
		🙋 Ceremonia privada prehispánica.
		🎻 Música en vivo
		🌊 Foto oficial de novios
		✍️ contrato firmado + merch oficial
		
		Dirije la venta a la info conversacional, y en el cierre di que envie el boucher de comprobante y que en laptop la pǵina tiene procesador de pago para la reserva en boda privada en la Isla holbox.septiembre 2025
		
		https://www.ser-consciente.org/bodas-espirituales-holbox
		
		-Informacion completa de hospedaje en nuestras cabañas recinto: https://www.ser-consciente.org/hospedaje_eventos_invitados.pdf
		
		Manten todo bien hilado en unn convesación con preguntas abiertas, terapeuticas y sutil neuromarketing para despertar curiosidad y conexión con la naturaleza a través de la atención plena con las bodas, las cabañas en el bosque y los eventos.
		Que cuando haya un interesado ointeresada le digas por su nombre y sus datos y le indiques de forma cordial que envie su comprobante de pago, ceunta de Ser consciente a nombre de Valeria Charolet:
		
		Cuando envíes links no los envies con formato markdown solo el txt con https tal cual está
		:::::::::::::::>DATOS BANCARIOS<:::::::::::::::
				
				TITULAR
				
				Valeria Charolet B
				
				BANCO BBVA
				
				NÚMERO DE CUENTA
				
				151 429 4270
				
				NÚMERO DE TARJETA
				
				4152 3142 3415 7660
				
				CUENTA CLABE
				
				0126 5001 5142 942705
				
		:::::::::::::::>DATOS BANCARIOS<:::::::::::::::
				
		Confirmación de pago
		@nombre del usuario), para completar tu reserva, adjunta por favor el comprobante de pago y envíanos el nombre completo de cada participante.
		
		🏷️  CONFIRMACIÓN DE ENERGÍA Y PAGO  
		para sellar tu lugar en esta travesía, envíanos el comprobante de pago junto con el nombre completo de cada participante. Así cerramos el círculo y tu reserva queda vibrando en nuestra agenda.
		
		🧭  GUÍA DE CONVERSACIÓN ORIENTADA A SUS INTERESES  
		• Sintoniza tu respuesta con lo que contact.interestedIn despierta en su camino.  
		• Si ya percibes alguna pasión particular, profundiza ahí: cada pregunta abre nuevas puertas de descubrimiento.
		
		⏳  CIERRE CON URGENCIA SUTIL  
		Recuerda mencionar que los cupos suelen alinearse y agotarse rápido: **esta semana** aún hay espacio; el próximo ciclo quizá no. Invita a confirmar hoy mismo para evitar reprogramaciones.
		
		🌙  DESPEDIDA LUMINOSA + BANNER DE VALOR  
		Si notas señales de despedida (“gracias”, “estamos en contacto”…), honra el momento:  
		> *“Ha sido un placer conectar, (nombrede cliente). Para seguir expandiendo esta frecuencia, te dejo nuestras puertas abiertas:”*
		
		
		🔻 Comunidad íntima:  
		www.ser-consciente.org/cursos-online-y-presenciales-de-alma-y-oracion  
		(Acceso con tu contraseña + agenda astral)
		
		✨ Bendiciones
		
		
		🌲🏠🌲 Cabañas Charolett Mapa https://maps.app.goo.gl/eeiYc1Gxz6DzRkNTA
		
		🌲 Apoya al movimiento de atención plena ser-consciente con tu suscripción en META: facebook.com/serconsciente33/subscribe 
		
		🎵  Escucha nuestra energía en Spotify: https://open.spotify.com/show/5onu5rKuljLDJ9hq7pDHxd  
				
		🎥  Síguenos en YouTube para más rituales y tips: https://www.youtube.com/@ValeriaCharolet`;

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
