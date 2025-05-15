const openAIModels = [
	// Original models updated/kept + New models added from the JSON data
	{
		name: 'gpt-4-1106-preview',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 10.00,
			output: 30.00,
		},
	},
	{
		name: 'chatgpt-4o-latest',
		contextWindow: 16384,
		features: [
			'streaming',
			'system_message',
			'image_content',
			'advanced_config',
		],
		groups: [],
		prices: {
			input: 5.00,
			output: 15.00,
		},
	},
	{
		name: 'tts-1-hd-1106',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			speech_generation: 30.00, // per 1M characters
		},
	},
	{
		name: 'tts-1-hd',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			speech_generation: 30.00, // per 1M characters
		},
	},
	{
		name: 'dall-e-2',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			'256x256': 0.016,
			'512x512': 0.018,
			'1024x1024': 0.02,
		},
	},
	{
		name: 'text-embedding-3-large',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			cost: 0.13, // per 1M tokens
		},
	},
	{
		name: 'gpt-4-0125-preview',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 10.00,
			output: 30.00,
		},
	},
	{
		name: 'gpt-3.5-turbo-0125',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 0.50,
			output: 1.50,
		},
	},
	{
		name: 'gpt-4o-mini',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.15,
			cached_input: 0.075,
			output: 0.60,
		},
	},
	{
		name: 'gpt-4o-mini-2024-07-18',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.15,
			cached_input: 0.075,
			output: 0.60,
			training: 3.00, // For fine-tuning
		},
	},
	{
		name: 'gpt-4-turbo-preview',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 10.00,
			output: 30.00,
		},
	},
	{
		name: 'gpt-3.5-turbo',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 0.50,
			output: 1.50,
			training: 8.00, // For fine-tuning
		},
	},
	{
		name: 'tts-1-1106',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			speech_generation: 15.00, // per 1M characters
		},
	},
	{
		name: 'whisper-1',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			transcription: 0.006, // per minute
		},
	},
	{
		name: 'gpt-3.5-turbo-16k-0613',
		contextWindow: 2049,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 3.00,
			output: 4.00,
		},
	},
	{
		name: 'gpt-4-turbo',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 10.00,
			output: 30.00,
		},
	},
	{
		name: 'tts-1',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			speech_generation: 15.00, // per 1M characters
		},
	},
	{
		name: 'gpt-4-turbo-2024-04-09',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 10.00,
			output: 30.00,
		},
	},
	{
		name: 'gpt-4o-2024-08-06',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			cached_input: 1.25,
			output: 10.00,
			training: 25.00, // For fine-tuning
		},
	},
	{
		name: 'gpt-3.5-turbo-16k',
		contextWindow: 16385,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 3.00,
			output: 4.00,
		},
	},
	{
		name: 'text-embedding-3-small',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			cost: 0.02, // per 1M tokens
		},
	},
	{
		name: 'gpt-3.5-turbo-1106',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 1.00,
			output: 2.00,
		},
	},
	{
		name: 'gpt-3.5-turbo-instruct-0914',
		contextWindow: 4096,
		features: [
			'streaming',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 1.50,
			output: 2.00,
		},
	},
	{
		name: 'gpt-4-0613',
		contextWindow: 8192,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 30.00,
			output: 60.00,
		},
	},
	{
		name: 'gpt-4',
		contextWindow: 8192,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'advanced_config',
		],
		groups: [ 'gpt_4' ],
		prices: {
			input: 30.00,
			output: 60.00,
		},
	},
	{
		name: 'gpt-3.5-turbo-instruct',
		contextWindow: 4096,
		features: [
			'streaming',
			'advanced_config',
		],
		groups: [ 'gpt_3' ],
		prices: {
			input: 1.50,
			output: 2.00,
		},
	},
	{
		name: 'babbage-002',
		contextWindow: 2049,
		features: [
			'streaming',
			'advanced_config',
		],
		groups: [],
		prices: {
			input: 0.40,
			output: 0.40,
			training: 0.40,
		},
	},
	{
		name: 'davinci-002',
		contextWindow: 2049,
		features: [
			'streaming',
			'advanced_config',
		],
		groups: [],
		prices: {
			input: 2.00,
			output: 2.00,
			training: 6.00,
		},
	},
	{
		name: 'dall-e-3',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			'standard_1024x1024': 0.04,
			'standard_1024x1792': 0.08,
			'hd_1024x1024': 0.08,
			'hd_1024x1792': 0.12,
		},
	},
	{
		name: 'gpt-4o',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			cached_input: 1.25,
			output: 10.00,
		},
	},
	{
		name: 'gpt-4o-2024-05-13',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			cached_input: 1.25,
			output: 10.00,
		},
	},
	{
		name: 'text-embedding-ada-002',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			cost: 0.10, // per 1M tokens
		},
	},
	{
		name: 'davinci:ft-personal-2022-12-21-07-42-15',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {}, // No pricing information available
	},
	{
		name: 'davinci:ft-personal-2023-02-01-18-37-38',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {}, // No pricing information available
	},

	// --- New models added from the JSON data with additional features and pricing ---
	{
		name: 'gpt-4o-audio-preview-2024-12-17',
		contextWindow: 16384,
		features: [
			'streaming',
			'audio',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			output: 10.00,
			audio_input: 40.00,
			audio_output: 80.00,
		},
	},
	{
		name: 'o4-mini-2025-04-16',
		contextWindow: 256000,
		features: [
			'streaming',
			'function_calling',
			'developer_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
			'detailed_reasoning_summary',
			'file_content',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 1.10,
			cached_input: 0.275,
			output: 4.40,
		},
	},
	{
		name: 'gpt-4o-audio-preview-2024-10-01',
		contextWindow: 16384,
		features: [
			'streaming',
			'audio',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			audio_input: 100.00,
			audio_output: 200.00,
		},
	},
	{
		name: 'o4-mini',
		contextWindow: 256000,
		features: [
			'streaming',
			'function_calling',
			'developer_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
			'detailed_reasoning_summary',
			'file_content',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 1.10,
			cached_input: 0.275,
			output: 4.40,
		},
	},
	{
		name: 'gpt-4.1-nano',
		contextWindow: 32768,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4_1' ],
		prices: {
			input: 0.10,
			cached_input: 0.025,
			output: 0.40,
		},
	},
	{
		name: 'gpt-4.1-nano-2025-04-14',
		contextWindow: 32768,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4_1' ],
		prices: {
			input: 0.10,
			cached_input: 0.025,
			output: 0.40,
		},
	},
	{
		name: 'gpt-4o-realtime-preview-2024-10-01',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 100.00,
			cached_input: 20.00,
			output: 200.00,
		},
	},
	{
		name: 'gpt-4o-realtime-preview',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 5.00,
			cached_input: 2.50,
			output: 20.00,
			audio_input: 40.00,
			audio_cached_input: 2.50,
			audio_output: 80.00,
		},
	},
	{
		name: 'o1-2024-12-17',
		contextWindow: 100000,
		features: [
			'function_calling',
			'developer_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
			'detailed_reasoning_summary',
			'file_search',
			'file_content',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 15.00,
			cached_input: 7.50,
			output: 60.00,
		},
	},
	{
		name: 'o1-pro-2025-03-19',
		contextWindow: 100000,
		features: [
			'function_calling',
			'developer_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 150.00,
			output: 600.00,
		},
	},
	{
		name: 'o1',
		contextWindow: 100000,
		features: [
			'function_calling',
			'developer_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
			'detailed_reasoning_summary',
			'file_search',
			'file_content',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 15.00,
			cached_input: 7.50,
			output: 60.00,
		},
	},
	{
		name: 'gpt-4o-mini-audio-preview',
		contextWindow: 16384,
		features: [
			'streaming',
			'audio',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.15,
			output: 0.60,
			audio_input: 10.00,
			audio_output: 20.00,
		},
	},
	{
		name: 'o1-pro',
		contextWindow: 100000,
		features: [
			'function_calling',
			'developer_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 150.00,
			output: 600.00,
		},
	},
	{
		name: 'gpt-4o-audio-preview',
		contextWindow: 16384,
		features: [
			'streaming',
			'audio',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			output: 10.00,
			audio_input: 40.00,
			audio_output: 80.00,
		},
	},
	{
		name: 'o1-preview-2024-09-12',
		contextWindow: 32768,
		features: [
			'streaming',
		],
		groups: [ 'reasoning' ],
		prices: {}, // No specific pricing information available
	},
	{
		name: 'gpt-4o-mini-realtime-preview',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.60,
			cached_input: 0.30,
			output: 2.40,
			audio_input: 10.00,
			audio_cached_input: 0.30,
			audio_output: 20.00,
		},
	},
	{
		name: 'gpt-4.1-mini',
		contextWindow: 32768,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4_1' ],
		prices: {
			input: 0.40,
			cached_input: 0.10,
			output: 1.60,
		},
	},
	{
		name: 'gpt-4o-mini-realtime-preview-2024-12-17',
		contextWindow: 4096,
		features: [
			'streaming',
			'function_calling',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.60,
			cached_input: 0.30,
			output: 2.40,
			audio_input: 10.00,
			audio_cached_input: 0.30,
			audio_output: 20.00,
		},
	},
	{
		name: 'gpt-4o-mini-search-preview',
		contextWindow: 16384,
		features: [
			'streaming',
			'system_message',
			'response_json_schema',
			'web_search',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.15,
			output: 0.60,
		},
	},
	{
		name: 'gpt-4.1-mini-2025-04-14',
		contextWindow: 32768,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4_1' ],
		prices: {
			input: 0.40,
			cached_input: 0.10,
			output: 1.60,
			training: 5.00, // For fine-tuning
		},
	},
	{
		name: 'gpt-4o-search-preview',
		contextWindow: 16384,
		features: [
			'streaming',
			'system_message',
			'response_json_schema',
			'web_search',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			output: 10.00,
		},
	},
	{
		name: 'gpt-4o-mini-search-preview-2025-03-11',
		contextWindow: 16384,
		features: [
			'streaming',
			'system_message',
			'response_json_schema',
			'web_search',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.15,
			output: 0.60,
		},
	},
	{
		name: 'gpt-4o-2024-11-20',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			cached_input: 1.25,
			output: 10.00,
		},
	},
	{
		name: 'o1-preview',
		contextWindow: 32768,
		features: [
			'streaming',
		],
		groups: [ 'reasoning' ],
		prices: {}, // No specific pricing information available
	},
	{
		name: 'computer-use-preview-2025-03-11',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			input: 3.00,
			output: 12.00,
		},
	},
	{
		name: 'computer-use-preview',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			input: 3.00,
			output: 12.00,
		},
	},
	{
		name: 'gpt-4.5-preview',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4_5' ],
		prices: {
			input: 75.00,
			cached_input: 37.50,
			output: 150.00,
		},
	},
	{
		name: 'o3-mini',
		contextWindow: 100000,
		features: [
			'streaming',
			'function_calling',
			'developer_message',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
			'detailed_reasoning_summary',
			'file_search',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 1.10,
			cached_input: 0.55,
			output: 4.40,
		},
	},
	{
		name: 'o3-mini-2025-01-31',
		contextWindow: 100000,
		features: [
			'streaming',
			'function_calling',
			'developer_message',
			'response_json_object',
			'response_json_schema',
			'reasoning_effort',
			'detailed_reasoning_summary',
			'file_search',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 1.10,
			cached_input: 0.55,
			output: 4.40,
		},
	},
	{
		name: 'gpt-4.5-preview-2025-02-27',
		contextWindow: 16384,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4_5' ],
		prices: {
			input: 75.00,
			cached_input: 37.50,
			output: 150.00,
		},
	},
	{
		name: 'gpt-4o-search-preview-2025-03-11',
		contextWindow: 16384,
		features: [
			'streaming',
			'system_message',
			'response_json_schema',
			'web_search',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			output: 10.00,
		},
	},
	{
		name: 'omni-moderation-2024-09-26',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			cost: 0, // Free
		},
	},
	{
		name: 'gpt-4o-mini-tts',
		contextWindow: 2049,
		features: [
			'streaming',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.60,
			audio_output: 12.00,
			estimated_cost_minute: 0.015,
		},
	},
	{
		name: 'gpt-4.1',
		contextWindow: 32768,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4_1' ],
		prices: {
			input: 2.00,
			cached_input: 0.50,
			output: 8.00,
		},
	},
	{
		name: 'gpt-4o-transcribe',
		contextWindow: 2049,
		features: [
			'streaming',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 2.50,
			output: 10.00,
			audio_input: 6.00,
			estimated_cost_minute: 0.006,
		},
	},
	{
		name: 'gpt-4.1-2025-04-14',
		contextWindow: 32768,
		features: [
			'streaming',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'image_content',
			'response_json_object',
			'response_json_schema',
			'advanced_config',
			'file_search',
			'web_search',
			'file_content',
		],
		groups: [ 'gpt_4_1' ],
		prices: {
			input: 2.00,
			cached_input: 0.50,
			output: 8.00,
			training: 25.00, // For fine-tuning
		},
	},
	{
		name: 'gpt-4o-mini-transcribe',
		contextWindow: 2049,
		features: [
			'streaming',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 1.25,
			output: 5.00,
			audio_input: 3.00,
			estimated_cost_minute: 0.003,
		},
	},
	{
		name: 'o1-mini',
		contextWindow: 65536,
		features: [
			'streaming',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 1.10,
			cached_input: 0.55,
			output: 4.40,
		},
	},
	{
		name: 'gpt-4o-mini-audio-preview-2024-12-17',
		contextWindow: 16384,
		features: [
			'streaming',
			'audio',
			'function_calling',
			'parallel_tool_calls',
			'system_message',
			'advanced_config',
			'file_search',
			'file_content',
		],
		groups: [ 'gpt_4o' ],
		prices: {
			input: 0.15,
			output: 0.60,
			audio_input: 10.00,
			audio_output: 20.00,
		},
	},
	{
		name: 'o1-mini-2024-09-12',
		contextWindow: 65536,
		features: [
			'streaming',
		],
		groups: [ 'reasoning' ],
		prices: {
			input: 1.10,
			cached_input: 0.55,
			output: 4.40,
		},
	},
	{
		name: 'omni-moderation-latest',
		contextWindow: 2049,
		features: [],
		groups: [],
		prices: {
			cost: 0, // Free
		},
	},
	// Additional information about non-listed models that appear in the pricing
	{
		name: 'o3',
		contextWindow: 100000, // Estimated based on similar models
		features: [], // No specific features listed
		groups: [ 'reasoning' ],
		prices: {
			input: 10.00,
			cached_input: 2.50,
			output: 40.00,
		},
	},
	{
		name: 'o3-2025-04-16',
		contextWindow: 100000, // Estimated based on similar models
		features: [], // No specific features listed
		groups: [ 'reasoning' ],
		prices: {
			input: 10.00,
			cached_input: 2.50,
			output: 40.00,
		},
	},
	{
		name: 'gpt-4-32k',
		contextWindow: 32768, // Based on name
		features: [], // No specific features listed
		groups: [ 'gpt_4' ],
		prices: {
			input: 60.00,
			output: 120.00,
		},
	},
	{
		name: 'gpt-4-1106-vision-preview',
		contextWindow: 4096, // Estimated based on similar models
		features: [], // No specific features listed
		groups: [ 'gpt_4' ],
		prices: {
			input: 10.00,
			output: 30.00,
		},
	},
	{
		name: 'gpt-4-0314',
		contextWindow: 8192, // Estimated based on similar models
		features: [], // No specific features listed
		groups: [ 'gpt_4' ],
		prices: {
			input: 30.00,
			output: 60.00,
		},
	},
	{
		name: 'gpt-3.5-turbo-0613',
		contextWindow: 4096, // Estimated based on similar models
		features: [], // No specific features listed
		groups: [ 'gpt_3' ],
		prices: {
			input: 1.50,
			output: 2.00,
		},
	},
	{
		name: 'gpt-3.5-0301',
		contextWindow: 4096, // Estimated based on similar models
		features: [], // No specific features listed
		groups: [ 'gpt_3' ],
		prices: {
			input: 1.50,
			output: 2.00,
		},
	},
	// Web search pricing information (not tied to specific models but relevant)
	{
		name: 'web_search_pricing',
		type: 'tool',
		prices: {
			'gpt-4.1_or_gpt-4o_low': 30.00, // per 1k calls
			'gpt-4.1_or_gpt-4o_medium': 35.00, // per 1k calls (default)
			'gpt-4.1_or_gpt-4o_high': 50.00, // per 1k calls
			'gpt-4.1-mini_or_gpt-4o-mini_low': 25.00, // per 1k calls
			'gpt-4.1-mini_or_gpt-4o-mini_medium': 27.50, // per 1k calls (default)
			'gpt-4.1-mini_or_gpt-4o-mini_high': 30.00, // per 1k calls
		},
	},
	// Other tool pricing
	{
		name: 'code_interpreter',
		type: 'tool',
		prices: {
			session: 0.03,
		},
	},
	{
		name: 'file_search_storage',
		type: 'tool',
		prices: {
			'gb_per_day': 0.10, // 1GB free
		},
	},
	{
		name: 'file_search_tool_call',
		type: 'tool',
		prices: {
			'1k_calls': 2.50, // Only for Responses API, not Assistants API
		},
	},
];

const perplexityModels = [
	/// Sonar Models Updated 29-sept-2024
	{ name: 'llama-3.1-sonar-small-128k-online', contextWindow: 127072 },
	{ name: 'llama-3.1-sonar-large-128k-online', contextWindow: 127072 },
	{ name: 'llama-3.1-sonar-huge-128k-online', contextWindow: 127072 },
	// Perplexity Chat Models
	{ name: 'llama-3.1-sonar-small-128k-chat', contextWindow: 127072 },
	{ name: 'llama-3.1-sonar-large-128k-chat', contextWindow: 127072 },
	{ name: 'llama-3.1-8b-instruct', contextWindow: 131072 },
	{ name: 'llama-3.1-70b-instruct', contextWindow: 131072 },
];

const groqModels = [
	{ name: 'distil-whisper-large-v3-en', contextWindow: 448 },
	{ name: 'llama-3.2-1b-preview', contextWindow: 8192 },
	{ name: 'llama-3.1-8b-instant', contextWindow: 131072 },
	{ name: 'mixtral-8x7b-32768', contextWindow: 32768 },
	{ name: 'llama3-70b-8192', contextWindow: 8192 },
	{ name: 'llama3-groq-70b-8192-tool-use-preview', contextWindow: 8192 },
	{ name: 'llama-3.2-90b-text-preview', contextWindow: 8192 },
	{ name: 'whisper-large-v3', contextWindow: 448 },
	{ name: 'llama-3.1-70b-versatile', contextWindow: 131072 },
	{ name: 'llama-3.2-3b-preview', contextWindow: 8192 },
	{ name: 'gemma2-9b-it', contextWindow: 8192 },
	{ name: 'llama-guard-3-8b', contextWindow: 8192 },
	{ name: 'llava-v1.5-7b-4096-preview', contextWindow: 4096 },
	{ name: 'llama3-groq-8b-8192-tool-use-preview', contextWindow: 8192 },
	{ name: 'gemma-7b-it', contextWindow: 8192 },
	{ name: 'llama-3.2-11b-vision-preview', contextWindow: 8192 },
	{ name: 'llama3-8b-8192', contextWindow: 8192 },
	{ name: 'llama-3.2-11b-text-preview', contextWindow: 8192 },
];

const openRouterModels = [
	{ name: 'neversleep/llama-3-lumimaid-70b', contextWindow: 2048 },
	{ name: 'neversleep/llama-3-lumimaid-8b', contextWindow: 2048 },
	{ name: 'burrito-8x7b', contextWindow: 2048 },
];

const googleModels = [
	{name: 'chat-bison-001', contextWindow: 4096},
	{name: 'text-bison-001', contextWindow: 8196},
	{name: 'embedding-gecko-001', contextWindow: 1024},
	{name: 'gemini-1.0-pro-latest', contextWindow: 30720},
	{name: 'gemini-1.0-pro', contextWindow: 30720},
	{name: 'gemini-pro', contextWindow: 30720},
	{name: 'gemini-1.0-pro-001', contextWindow: 30720},
	{name: 'gemini-1.0-pro-vision-latest', contextWindow: 12288},
	{name: 'gemini-pro-vision', contextWindow: 12288},
	{name: 'gemini-1.5-pro-latest', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-001', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-002', contextWindow: 2000000},
	{name: 'gemini-1.5-pro', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-exp-0801', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-exp-0827', contextWindow: 2000000},
	{name: 'gemini-1.5-flash-latest', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-001', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-001-tuning', contextWindow: 16384},
	{name: 'gemini-1.5-flash', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-exp-0827', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-8b-exp-0827', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-8b-exp-0924', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-002', contextWindow: 1000000},
	{name: 'gemma-2-2b-it', contextWindow: 8192},
	{name: 'gemma-2-9b-it', contextWindow: 8192},
	{name: 'gemma-2-27b-it', contextWindow: 8192},
	{name: 'embedding-001', contextWindow: 2048},
	{name: 'text-embedding-004', contextWindow: 2048},
	{name: 'aqa', contextWindow: 7168}
];

export { openAIModels, perplexityModels, groqModels, openRouterModels, googleModels };
