export type EmotionType =
  | 'happy'
  | 'excited'
  | 'curious'
  | 'shy'
  | 'sleepy'
  | 'thinking'
  | 'sad'
  | 'love';

export type ActionType =
  | 'idle'
  | 'jump'
  | 'spin'
  | 'wave'
  | 'nod'
  | 'dance'
  | 'shake';

export type PetSpecies = 'mochi' | 'cyberfox' | 'astracat' | 'custom_model';

export interface PetThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cheekColor: string;
  eyeColor: string;
  emissiveColor: string;
  bgGradient: string;
}

export type LLMProviderId =
  | 'deepseek'
  | 'openai'
  | 'siliconflow'
  | 'qwen'
  | 'glm'
  | 'ollama'
  | 'custom';

export interface LLMConfig {
  provider: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export type TTSProviderId =
  | 'edge'
  | 'browser'
  | 'openai'
  | 'siliconflow'
  | 'fishaudio'
  | 'elevenlabs'
  | 'custom_tts';

export interface TTSConfig {
  provider: TTSProviderId;
  enabled: boolean;
  autoPlay: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  voice: string;
  speed: number;
  pitch: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotion?: EmotionType;
  action?: ActionType;
  timestamp: number;
}

export interface PetStatus {
  name: string;
  species: PetSpecies;
  themeId: string;
  customModelUrl: string | null;
  customModelType: 'vrm' | 'gltf' | null;
  emotion: EmotionType;
  action: ActionType;
  energy: number;      // 0 - 100
  affection: number;   // 0 - 100
  mood: number;        // 0 - 100
  level: number;
  isSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  mouthOpen: number;   // 0.0 - 1.0 real-time audio amplitude
  speechBubble: string;
}
