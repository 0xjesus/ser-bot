import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * WahaService - A singleton service for interacting with the WhatsApp HTTP API (WAHA)
 */
class WahaService {
	static instance = null;
	static baseURL = process.env.WAHA_API_URL || 'https://waha.qcdr.io';
	static apiKey = process.env.WAHA_API_KEY;
	static session = process.env.WAHA_SESSION || 'default';

	/**
	 * Get HTTP headers with API key
	 * @returns {Object} Headers for API requests
	 */
	static getHeaders() {
		return {
			'X-Api-Key': this.apiKey,
			'Content-Type': 'application/json',
		};
	}

	/**
	 * Make API request to WAHA
	 * @param {string} method - HTTP method
	 * @param {string} endpoint - API endpoint
	 * @param {Object} data - Request data
	 * @returns {Promise} API response
	 */
	static async request(method, endpoint, data = null) {
		try {
			const url = `${ this.baseURL }${ endpoint }`;
			const headers = this.getHeaders();
			const config = { method, url, headers };

			// Only add data to the request if it's not null
			if(data !== null) {
				config.data = data;
			}

			const response = await axios(config);
			return response.data;
		} catch(error) {
			console.error(`WAHA API Error: ${ error.message }`);
			throw error;
		}
	}

	// ==================== Session Management ====================

	/**
	 * List all sessions
	 * @param {boolean} all - Include stopped sessions
	 * @returns {Promise} List of sessions
	 */
	static async listSessions(all = false) {
		return this.request('get', `/api/sessions?all=${ all }`);
	}

	/**
	 * Create a new session
	 * @param {string} name - Session name
	 * @param {Object} config - Session configuration
	 * @param {boolean} start - Whether to start the session
	 * @returns {Promise} Created session
	 */
	static async createSession(name, config = {}, start = true) {
		return this.request('post', '/api/sessions', { name, config, start });
	}

	/**
	 * Get session information
	 * @param {string} session - Session name
	 * @returns {Promise} Session information
	 */
	static async getSession(session = this.session) {
		return this.request('get', `/api/sessions/${ session }`);
	}

	/**
	 * Update a session
	 * @param {string} session - Session name
	 * @param {Object} config - Session configuration
	 * @returns {Promise} Updated session
	 */
	static async updateSession(session = this.session, config = {}) {
		return this.request('put', `/api/sessions/${ session }`, { config });
	}

	/**
	 * Delete a session
	 * @param {string} session - Session name
	 * @returns {Promise} Delete result
	 */
	static async deleteSession(session = this.session) {
		return this.request('delete', `/api/sessions/${ session }`);
	}

	/**
	 * Start a session
	 * @param {string} session - Session name
	 * @returns {Promise} Started session
	 */
	static async startSession(session = this.session) {
		return this.request('post', `/api/sessions/${ session }/start`);
	}

	/**
	 * Stop a session
	 * @param {string} session - Session name
	 * @returns {Promise} Stopped session
	 */
	static async stopSession(session = this.session) {
		return this.request('post', `/api/sessions/${ session }/stop`);
	}

	/**
	 * Logout from a session
	 * @param {string} session - Session name
	 * @returns {Promise} Logout result
	 */
	static async logoutSession(session = this.session) {
		return this.request('post', `/api/sessions/${ session }/logout`);
	}

	/**
	 * Restart a session
	 * @param {string} session - Session name
	 * @returns {Promise} Restarted session
	 */
	static async restartSession(session = this.session) {
		return this.request('post', `/api/sessions/${ session }/restart`);
	}

	/**
	 * Get authenticated account information
	 * @param {string} session - Session name
	 * @returns {Promise} Account information
	 */
	static async getMe(session = this.session) {
		return this.request('get', `/api/sessions/${ session }/me`);
	}

	// ==================== Authentication ====================

	/**
	 * Get QR code for pairing WhatsApp API
	 * @param {string} session - Session name
	 * @param {string} format - QR code format (image or raw)
	 * @returns {Promise} QR code
	 */
	static async getQR(session = this.session, format = 'image') {
		return this.request('get', `/api/${ session }/auth/qr?format=${ format }`);
	}

	/**
	 * Request authentication code
	 * @param {string} session - Session name
	 * @param {string} phoneNumber - Phone number
	 * @param {string} method - Authentication method
	 * @returns {Promise} Authentication result
	 */
	static async requestCode(session = this.session, phoneNumber, method = null) {
		return this.request('post', `/api/${ session }/auth/request-code`, { phoneNumber, method });
	}

	// ==================== Profile Management ====================

	/**
	 * Get profile information
	 * @param {string} session - Session name
	 * @returns {Promise} Profile information
	 */
	static async getProfile(session = this.session) {
		return this.request('get', `/api/${ session }/profile`);
	}

	/**
	 * Set profile name
	 * @param {string} session - Session name
	 * @param {string} name - Profile name
	 * @returns {Promise} Result
	 */
	static async setProfileName(session = this.session, name) {
		return this.request('put', `/api/${ session }/profile/name`, { name });
	}

	/**
	 * Set profile status
	 * @param {string} session - Session name
	 * @param {string} status - Profile status
	 * @returns {Promise} Result
	 */
	static async setProfileStatus(session = this.session, status) {
		return this.request('put', `/api/${ session }/profile/status`, { status });
	}

	/**
	 * Set profile picture
	 * @param {string} session - Session name
	 * @param {Object} file - Profile picture file
	 * @returns {Promise} Result
	 */
	static async setProfilePicture(session = this.session, file) {
		return this.request('put', `/api/${ session }/profile/picture`, { file });
	}

	/**
	 * Delete profile picture
	 * @param {string} session - Session name
	 * @returns {Promise} Result
	 */
	static async deleteProfilePicture(session = this.session) {
		return this.request('delete', `/api/${ session }/profile/picture`);
	}

	// ==================== Messaging ====================

	/**
	 * Send a text message
	 * @param {string} chatId - Chat ID
	 * @param {string} text - Message text
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendText(chatId, text, options = {}) {
		const data = {
			chatId,
			text,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendText', data);
	}

	/**
	 * Send an image
	 * @param {string} chatId - Chat ID
	 * @param {Object} file - Image file
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendImage(chatId, file, options = {}) {
		const data = {
			chatId,
			file,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendImage', data);
	}

	/**
	 * Send a file
	 * @param {string} chatId - Chat ID
	 * @param {Object} file - File
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendFile(chatId, file, options = {}) {
		const data = {
			chatId,
			file,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendFile', data);
	}

	/**
	 * Send a voice message
	 * @param {string} chatId - Chat ID
	 * @param {Object} file - Voice file
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendVoice(chatId, file, options = {}) {
		const data = {
			chatId,
			file,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendVoice', data);
	}

	/**
	 * Send a video
	 * @param {string} chatId - Chat ID
	 * @param {Object} file - Video file
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendVideo(chatId, file, options = {}) {
		const data = {
			chatId,
			file,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendVideo', data);
	}

	/**
	 * Send a text message with custom link preview
	 * @param {string} chatId - Chat ID
	 * @param {string} text - Message text
	 * @param {Object} preview - Link preview data
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendLinkWithCustomPreview(chatId, text, preview, options = {}) {
		const data = {
			chatId,
			text,
			preview,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/send/link-custom-preview', data);
	}

	/**
	 * Send buttons (interactive message)
	 * @param {string} chatId - Chat ID
	 * @param {string} body - Message body
	 * @param {Array} buttons - Message buttons
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent message
	 */
	static async sendButtons(chatId, body, buttons, options = {}) {
		const data = {
			chatId,
			body,
			buttons,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendButtons', data);
	}

	/**
	 * Forward a message
	 * @param {string} chatId - Target chat ID
	 * @param {string} messageId - Message ID to forward
	 * @returns {Promise} Forwarded message
	 */
	static async forwardMessage(chatId, messageId) {
		const data = {
			chatId,
			messageId,
			session: this.session,
		};
		return this.request('post', '/api/forwardMessage', data);
	}

	/**
	 * Mark messages as seen
	 * @param {string} chatId - Chat ID
	 * @param {Array} messageIds - Message IDs to mark as seen
	 * @returns {Promise} Result
	 */
	static async markAsSeen(chatId, messageIds = []) {
		const data = {
			chatId,
			messageIds,
			session: this.session,
		};
		return this.request('post', '/api/sendSeen', data);
	}

	/**
	 * Start typing in a chat
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async startTyping(chatId) {
		const data = {
			chatId,
			session: this.session,
		};
		return this.request('post', '/api/startTyping', data);
	}

	/**
	 * Stop typing in a chat
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async stopTyping(chatId) {
		const data = {
			chatId,
			session: this.session,
		};
		return this.request('post', '/api/stopTyping', data);
	}

	/**
	 * React to a message
	 * @param {string} messageId - Message ID
	 * @param {string} reaction - Emoji reaction
	 * @returns {Promise} Result
	 */
	static async setReaction(messageId, reaction) {
		const data = {
			messageId,
			reaction,
			session: this.session,
		};
		return this.request('put', '/api/reaction', data);
	}

	/**
	 * Star or unstar a message
	 * @param {string} messageId - Message ID
	 * @param {string} chatId - Chat ID
	 * @param {boolean} star - Whether to star or unstar
	 * @returns {Promise} Result
	 */
	static async setMessageStar(messageId, chatId, star = true) {
		const data = {
			messageId,
			chatId,
			star,
			session: this.session,
		};
		return this.request('put', '/api/star', data);
	}

	/**
	 * Send a poll
	 * @param {string} chatId - Chat ID
	 * @param {Object} poll - Poll data
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent poll
	 */
	static async sendPoll(chatId, poll, options = {}) {
		const data = {
			chatId,
			poll,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendPoll', data);
	}

	/**
	 * Send a location
	 * @param {string} chatId - Chat ID
	 * @param {number} latitude - Latitude
	 * @param {number} longitude - Longitude
	 * @param {string} title - Location title
	 * @param {Object} options - Additional options
	 * @returns {Promise} Sent location
	 */
	static async sendLocation(chatId, latitude, longitude, title, options = {}) {
		const data = {
			chatId,
			latitude,
			longitude,
			title,
			session: this.session,
			...options,
		};
		return this.request('post', '/api/sendLocation', data);
	}

	/**
	 * Send contact vCard
	 * @param {string} chatId - Chat ID
	 * @param {Array} contacts - Contact data
	 * @returns {Promise} Sent contact
	 */
	static async sendContactVcard(chatId, contacts) {
		const data = {
			chatId,
			contacts,
			session: this.session,
		};
		return this.request('post', '/api/sendContactVcard', data);
	}

	/**
	 * Reply to a button message
	 * @param {string} chatId - Chat ID
	 * @param {string} selectedDisplayText - Selected button text
	 * @param {string} selectedButtonID - Selected button ID
	 * @returns {Promise} Reply result
	 */
	static async sendButtonsReply(chatId, selectedDisplayText, selectedButtonID) {
		const data = {
			chatId,
			selectedDisplayText,
			selectedButtonID,
			session: this.session,
		};
		return this.request('post', '/api/send/buttons/reply', data);
	}

	// ==================== Chats ====================

	/**
	 * Get all chats
	 * @param {string} session - Session name
	 * @param {Object} options - Additional options (sortBy, sortOrder, limit, offset)
	 * @returns {Promise} Chats list
	 */
	static async getChats(session = this.session, options = {}) {
		const params = new URLSearchParams(options).toString();
		return this.request('get', `/api/${ session }/chats?${ params }`);
	}

	/**
	 * Get chats overview
	 * @param {string} session - Session name
	 * @param {number} limit - Limit
	 * @param {number} offset - Offset
	 * @returns {Promise} Chats overview
	 */
	static async getChatsOverview(session = this.session, limit = 20, offset = 0) {
		return this.request('get', `/api/${ session }/chats/overview?limit=${ limit }&offset=${ offset }`);
	}

	/**
	 * Delete a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async deleteChat(session = this.session, chatId) {
		return this.request('delete', `/api/${ session }/chats/${ chatId }`);
	}

	/**
	 * Get chat picture
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {boolean} refresh - Whether to refresh the picture
	 * @returns {Promise} Chat picture
	 */
	static async getChatPicture(session = this.session, chatId, refresh = false) {
		return this.request('get', `/api/${ session }/chats/${ chatId }/picture?refresh=${ refresh }`);
	}

	/**
	 * Get chat messages
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {Object} options - Additional options
	 * @returns {Promise} Chat messages
	 */
	static async getChatMessages(session = this.session, chatId, options = {}) {
		const params = new URLSearchParams({
			downloadMedia: true,
			limit: 10,
			...options,
		}).toString();
		return this.request('get', `/api/${ session }/chats/${ chatId }/messages?${ params }`);
	}

	/**
	 * Clear all messages from a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async clearChatMessages(session = this.session, chatId) {
		return this.request('delete', `/api/${ session }/chats/${ chatId }/messages`);
	}

	/**
	 * Read unread messages in a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {Object} options - Additional options
	 * @returns {Promise} Result
	 */
	static async readChatMessages(session = this.session, chatId, options = {}) {
		const params = new URLSearchParams(options).toString();
		return this.request('post', `/api/${ session }/chats/${ chatId }/messages/read?${ params }`);
	}

	/**
	 * Get a specific message by ID
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {string} messageId - Message ID
	 * @param {boolean} downloadMedia - Whether to download media
	 * @returns {Promise} Message
	 */
	static async getChatMessage(session = this.session, chatId, messageId, downloadMedia = true) {
		return this.request('get', `/api/${ session }/chats/${ chatId }/messages/${ messageId }?downloadMedia=${ downloadMedia }`);
	}

	/**
	 * Delete a message
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {string} messageId - Message ID
	 * @returns {Promise} Result
	 */
	static async deleteMessage(session = this.session, chatId, messageId) {
		return this.request('delete', `/api/${ session }/chats/${ chatId }/messages/${ messageId }`);
	}

	/**
	 * Edit a message
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {string} messageId - Message ID
	 * @param {string} text - New message text
	 * @param {Object} options - Additional options
	 * @returns {Promise} Result
	 */
	static async editMessage(session = this.session, chatId, messageId, text, options = {}) {
		const data = {
			text,
			...options,
		};
		return this.request('put', `/api/${ session }/chats/${ chatId }/messages/${ messageId }`, data);
	}

	/**
	 * Pin a message
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {string} messageId - Message ID
	 * @param {number} duration - Pin duration in seconds
	 * @returns {Promise} Result
	 */
	static async pinMessage(session = this.session, chatId, messageId, duration = 86400) {
		return this.request('post', `/api/${ session }/chats/${ chatId }/messages/${ messageId }/pin`, { duration });
	}

	/**
	 * Unpin a message
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {string} messageId - Message ID
	 * @returns {Promise} Result
	 */
	static async unpinMessage(session = this.session, chatId, messageId) {
		return this.request('post', `/api/${ session }/chats/${ chatId }/messages/${ messageId }/unpin`);
	}

	/**
	 * Archive a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async archiveChat(session = this.session, chatId) {
		return this.request('post', `/api/${ session }/chats/${ chatId }/archive`);
	}

	/**
	 * Unarchive a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async unarchiveChat(session = this.session, chatId) {
		return this.request('post', `/api/${ session }/chats/${ chatId }/unarchive`);
	}

	/**
	 * Mark a chat as unread
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async markChatUnread(session = this.session, chatId) {
		return this.request('post', `/api/${ session }/chats/${ chatId }/unread`);
	}

	// ==================== Channels ====================

	/**
	 * Get channels list
	 * @param {string} session - Session name
	 * @param {string} role - Filter by role
	 * @returns {Promise} Channels list
	 */
	static async getChannels(session = this.session, role = null) {
		const params = role ? `?role=${ role }` : '';
		return this.request('get', `/api/${ session }/channels${ params }`);
	}

	/**
	 * Create a new channel
	 * @param {string} session - Session name
	 * @param {Object} channelData - Channel data
	 * @returns {Promise} Created channel
	 */
	static async createChannel(session = this.session, channelData) {
		return this.request('post', `/api/${ session }/channels`, channelData);
	}

	/**
	 * Get channel info
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID or invite code
	 * @returns {Promise} Channel info
	 */
	static async getChannel(session = this.session, channelId) {
		return this.request('get', `/api/${ session }/channels/${ channelId }`);
	}

	/**
	 * Delete a channel
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID
	 * @returns {Promise} Result
	 */
	static async deleteChannel(session = this.session, channelId) {
		return this.request('delete', `/api/${ session }/channels/${ channelId }`);
	}

	/**
	 * Preview channel messages
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID or invite code
	 * @param {boolean} downloadMedia - Whether to download media
	 * @param {number} limit - Limit
	 * @returns {Promise} Channel messages
	 */
	static async previewChannelMessages(session = this.session, channelId, downloadMedia = false, limit = 10) {
		return this.request('get', `/api/${ session }/channels/${ channelId }/messages/preview?downloadMedia=${ downloadMedia }&limit=${ limit }`);
	}

	/**
	 * Follow a channel
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID
	 * @returns {Promise} Result
	 */
	static async followChannel(session = this.session, channelId) {
		return this.request('post', `/api/${ session }/channels/${ channelId }/follow`);
	}

	/**
	 * Unfollow a channel
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID
	 * @returns {Promise} Result
	 */
	static async unfollowChannel(session = this.session, channelId) {
		return this.request('post', `/api/${ session }/channels/${ channelId }/unfollow`);
	}

	/**
	 * Mute a channel
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID
	 * @returns {Promise} Result
	 */
	static async muteChannel(session = this.session, channelId) {
		return this.request('post', `/api/${ session }/channels/${ channelId }/mute`);
	}

	/**
	 * Unmute a channel
	 * @param {string} session - Session name
	 * @param {string} channelId - Channel ID
	 * @returns {Promise} Result
	 */
	static async unmuteChannel(session = this.session, channelId) {
		return this.request('post', `/api/${ session }/channels/${ channelId }/unmute`);
	}

	/**
	 * Search channels by view
	 * @param {string} session - Session name
	 * @param {Object} searchData - Search parameters
	 * @returns {Promise} Search results
	 */
	static async searchChannelsByView(session = this.session, searchData) {
		return this.request('post', `/api/${ session }/channels/search/by-view`, searchData);
	}

	/**
	 * Search channels by text
	 * @param {string} session - Session name
	 * @param {Object} searchData - Search parameters
	 * @returns {Promise} Search results
	 */
	static async searchChannelsByText(session = this.session, searchData) {
		return this.request('post', `/api/${ session }/channels/search/by-text`, searchData);
	}

	// ==================== Status ====================

	/**
	 * Send text status
	 * @param {string} session - Session name
	 * @param {Object} statusData - Status data
	 * @returns {Promise} Result
	 */
	static async sendTextStatus(session = this.session, statusData) {
		return this.request('post', `/api/${ session }/status/text`, statusData);
	}

	/**
	 * Send image status
	 * @param {string} session - Session name
	 * @param {Object} statusData - Status data
	 * @returns {Promise} Result
	 */
	static async sendImageStatus(session = this.session, statusData) {
		return this.request('post', `/api/${ session }/status/image`, statusData);
	}

	/**
	 * Send voice status
	 * @param {string} session - Session name
	 * @param {Object} statusData - Status data
	 * @returns {Promise} Result
	 */
	static async sendVoiceStatus(session = this.session, statusData) {
		return this.request('post', `/api/${ session }/status/voice`, statusData);
	}

	/**
	 * Send video status
	 * @param {string} session - Session name
	 * @param {Object} statusData - Status data
	 * @returns {Promise} Result
	 */
	static async sendVideoStatus(session = this.session, statusData) {
		return this.request('post', `/api/${ session }/status/video`, statusData);
	}

	/**
	 * Delete a status
	 * @param {string} session - Session name
	 * @param {Object} deleteData - Delete parameters
	 * @returns {Promise} Result
	 */
	static async deleteStatus(session = this.session, deleteData) {
		return this.request('post', `/api/${ session }/status/delete`, deleteData);
	}

	/**
	 * Generate a new message ID for status
	 * @param {string} session - Session name
	 * @returns {Promise} New message ID
	 */
	static async getNewStatusMessageId(session = this.session) {
		return this.request('get', `/api/${ session }/status/new-message-id`);
	}

	// ==================== Labels ====================

	/**
	 * Get all labels
	 * @param {string} session - Session name
	 * @returns {Promise} Labels list
	 */
	static async getLabels(session = this.session) {
		return this.request('get', `/api/${ session }/labels`);
	}

	/**
	 * Create a new label
	 * @param {string} session - Session name
	 * @param {Object} labelData - Label data
	 * @returns {Promise} Created label
	 */
	static async createLabel(session = this.session, labelData) {
		return this.request('post', `/api/${ session }/labels`, labelData);
	}

	/**
	 * Update a label
	 * @param {string} session - Session name
	 * @param {string} labelId - Label ID
	 * @param {Object} labelData - Label data
	 * @returns {Promise} Updated label
	 */
	static async updateLabel(session = this.session, labelId, labelData) {
		return this.request('put', `/api/${ session }/labels/${ labelId }`, labelData);
	}

	/**
	 * Delete a label
	 * @param {string} session - Session name
	 * @param {string} labelId - Label ID
	 * @returns {Promise} Result
	 */
	static async deleteLabel(session = this.session, labelId) {
		return this.request('delete', `/api/${ session }/labels/${ labelId }`);
	}

	/**
	 * Get labels for a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Chat labels
	 */
	static async getChatLabels(session = this.session, chatId) {
		return this.request('get', `/api/${ session }/labels/chats/${ chatId }`);
	}

	/**
	 * Set labels for a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {Array} labels - Labels to set
	 * @returns {Promise} Result
	 */
	static async setChatLabels(session = this.session, chatId, labels) {
		return this.request('put', `/api/${ session }/labels/chats/${ chatId }`, { labels });
	}

	/**
	 * Get chats by label
	 * @param {string} session - Session name
	 * @param {string} labelId - Label ID
	 * @returns {Promise} Chats list
	 */
	static async getChatsByLabel(session = this.session, labelId) {
		return this.request('get', `/api/${ session }/labels/${ labelId }/chats`);
	}

	// ==================== Contacts ====================

	/**
	 * Get all contacts
	 * @param {Object} options - Additional options
	 * @returns {Promise} Contacts list
	 */
	static async getAllContacts(options = {}) {
		const params = new URLSearchParams({
			session: this.session,
			...options,
		}).toString();
		return this.request('get', `/api/contacts/all?${ params }`);
	}

	/**
	 * Get contact info
	 * @param {string} contactId - Contact ID
	 * @returns {Promise} Contact info
	 */
	static async getContact(contactId) {
		return this.request('get', `/api/contacts?contactId=${ contactId }&session=${ this.session }`);
	}

	/**
	 * Check if a phone number exists on WhatsApp
	 * @param {string} phone - Phone number
	 * @returns {Promise} Result
	 */
	static async checkNumberExists(phone) {
		return this.request('get', `/api/contacts/check-exists?phone=${ phone }&session=${ this.session }`);
	}

	/**
	 * Get contact's about info
	 * @param {string} contactId - Contact ID
	 * @returns {Promise} About info
	 */
	static async getContactAbout(contactId) {
		return this.request('get', `/api/contacts/about?contactId=${ contactId }&session=${ this.session }`);
	}

	/**
	 * Get contact's profile picture
	 * @param {string} contactId - Contact ID
	 * @param {boolean} refresh - Whether to refresh the picture
	 * @returns {Promise} Profile picture
	 */
	static async getContactProfilePicture(contactId, refresh = false) {
		return this.request('get', `/api/contacts/profile-picture?contactId=${ contactId }&refresh=${ refresh }&session=${ this.session }`);
	}

	/**
	 * Block a contact
	 * @param {string} contactId - Contact ID
	 * @returns {Promise} Result
	 */
	static async blockContact(contactId) {
		return this.request('post', '/api/contacts/block', {
			contactId,
			session: this.session,
		});
	}

	/**
	 * Unblock a contact
	 * @param {string} contactId - Contact ID
	 * @returns {Promise} Result
	 */
	static async unblockContact(contactId) {
		return this.request('post', '/api/contacts/unblock', {
			contactId,
			session: this.session,
		});
	}

	// ==================== Groups ====================

	/**
	 * Get all groups
	 * @param {string} session - Session name
	 * @param {Object} options - Additional options
	 * @returns {Promise} Groups list
	 */
	static async getGroups(session = this.session, options = {}) {
		const params = new URLSearchParams(options).toString();
		return this.request('get', `/api/${ session }/groups?${ params }`);
	}

	/**
	 * Create a new group
	 * @param {string} session - Session name
	 * @param {string} name - Group name
	 * @param {Array} participants - Group participants
	 * @returns {Promise} Created group
	 */
	static async createGroup(session = this.session, name, participants) {
		return this.request('post', `/api/${ session }/groups`, {
			name,
			participants,
		});
	}

	/**
	 * Get info about a group before joining
	 * @param {string} session - Session name
	 * @param {string} code - Group invite code or URL
	 * @returns {Promise} Group info
	 */
	static async getGroupJoinInfo(session = this.session, code) {
		return this.request('get', `/api/${ session }/groups/join-info?code=${ code }`);
	}

	/**
	 * Join a group via invite code
	 * @param {string} session - Session name
	 * @param {string} code - Group invite code or URL
	 * @returns {Promise} Join result
	 */
	static async joinGroup(session = this.session, code) {
		return this.request('post', `/api/${ session }/groups/join`, { code });
	}

	/**
	 * Get group info
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @returns {Promise} Group info
	 */
	static async getGroup(session = this.session, groupId) {
		return this.request('get', `/api/${ session }/groups/${ groupId }`);
	}

	/**
	 * Delete a group
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @returns {Promise} Result
	 */
	static async deleteGroup(session = this.session, groupId) {
		return this.request('delete', `/api/${ session }/groups/${ groupId }`);
	}

	/**
	 * Leave a group
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @returns {Promise} Result
	 */
	static async leaveGroup(session = this.session, groupId) {
		return this.request('post', `/api/${ session }/groups/${ groupId }/leave`);
	}

	/**
	 * Get group picture
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {boolean} refresh - Whether to refresh the picture
	 * @returns {Promise} Group picture
	 */
	static async getGroupPicture(session = this.session, groupId, refresh = false) {
		return this.request('get', `/api/${ session }/groups/${ groupId }/picture?refresh=${ refresh }`);
	}

	/**
	 * Set group picture
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {Object} file - Picture file
	 * @returns {Promise} Result
	 */
	static async setGroupPicture(session = this.session, groupId, file) {
		return this.request('put', `/api/${ session }/groups/${ groupId }/picture`, { file });
	}

	/**
	 * Delete group picture
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @returns {Promise} Result
	 */
	static async deleteGroupPicture(session = this.session, groupId) {
		return this.request('delete', `/api/${ session }/groups/${ groupId }/picture`);
	}

	/**
	 * Set group description
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {string} description - Group description
	 * @returns {Promise} Result
	 */
	static async setGroupDescription(session = this.session, groupId, description) {
		return this.request('put', `/api/${ session }/groups/${ groupId }/description`, { description });
	}

	/**
	 * Set group subject
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {string} subject - Group subject
	 * @returns {Promise} Result
	 */
	static async setGroupSubject(session = this.session, groupId, subject) {
		return this.request('put', `/api/${ session }/groups/${ groupId }/subject`, { subject });
	}

	/**
	 * Get group participants
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @returns {Promise} Group participants
	 */
	static async getGroupParticipants(session = this.session, groupId) {
		return this.request('get', `/api/${ session }/groups/${ groupId }/participants`);
	}

	/**
	 * Add participants to a group
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {Array} participants - Participants to add
	 * @returns {Promise} Result
	 */
	static async addGroupParticipants(session = this.session, groupId, participants) {
		return this.request('post', `/api/${ session }/groups/${ groupId }/participants/add`, { participants });
	}

	/**
	 * Remove participants from a group
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {Array} participants - Participants to remove
	 * @returns {Promise} Result
	 */
	static async removeGroupParticipants(session = this.session, groupId, participants) {
		return this.request('post', `/api/${ session }/groups/${ groupId }/participants/remove`, { participants });
	}

	/**
	 * Promote participants to admin
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {Array} participants - Participants to promote
	 * @returns {Promise} Result
	 */
	static async promoteToAdmin(session = this.session, groupId, participants) {
		return this.request('post', `/api/${ session }/groups/${ groupId }/admin/promote`, { participants });
	}

	/**
	 * Demote participants from admin
	 * @param {string} session - Session name
	 * @param {string} groupId - Group ID
	 * @param {Array} participants - Participants to demote
	 * @returns {Promise} Result
	 */
	static async demoteFromAdmin(session = this.session, groupId, participants) {
		return this.request('post', `/api/${ session }/groups/${ groupId }/admin/demote`, { participants });
	}

	// ==================== Presence ====================

	/**
	 * Set presence status
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @param {string} presence - Presence status
	 * @returns {Promise} Result
	 */
	static async setPresence(session = this.session, chatId, presence) {
		return this.request('post', `/api/${ session }/presence`, { chatId, presence });
	}

	/**
	 * Get all subscribed presence information
	 * @param {string} session - Session name
	 * @returns {Promise} Presence information
	 */
	static async getAllPresence(session = this.session) {
		return this.request('get', `/api/${ session }/presence`);
	}

	/**
	 * Get presence for a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Presence information
	 */
	static async getPresence(session = this.session, chatId) {
		return this.request('get', `/api/${ session }/presence/${ chatId }`);
	}

	/**
	 * Subscribe to presence events for a chat
	 * @param {string} session - Session name
	 * @param {string} chatId - Chat ID
	 * @returns {Promise} Result
	 */
	static async subscribePresence(session = this.session, chatId) {
		return this.request('post', `/api/${ session }/presence/${ chatId }/subscribe`);
	}

	// ==================== Utilities ====================

	/**
	 * Take a screenshot
	 * @param {string} session - Session name
	 * @returns {Promise} Screenshot
	 */
	static async takeScreenshot(session = this.session) {
		return this.request('get', `/api/screenshot?session=${ session }`);
	}

	/**
	 * Ping the server
	 * @returns {Promise} Ping result
	 */
	static async ping() {
		return this.request('get', '/ping');
	}

	/**
	 * Check server health
	 * @returns {Promise} Health status
	 */
	static async checkHealth() {
		return this.request('get', '/health');
	}

	/**
	 * Get server version
	 * @returns {Promise} Server version
	 */
	static async getServerVersion() {
		return this.request('get', '/api/server/version');
	}

	/**
	 * Get server environment
	 * @param {boolean} all - Include all environment variables
	 * @returns {Promise} Server environment
	 */
	static async getServerEnvironment(all = false) {
		return this.request('get', `/api/server/environment?all=${ all }`);
	}

	/**
	 * Get server status
	 * @returns {Promise} Server status
	 */
	static async getServerStatus() {
		return this.request('get', '/api/server/status');
	}

	/**
	 * Stop the server
	 * @param {boolean} force - Force stop
	 * @returns {Promise} Stop result
	 */
	static async stopServer(force = false) {
		return this.request('post', '/api/server/stop', { force });
	}
}

export default WahaService;
