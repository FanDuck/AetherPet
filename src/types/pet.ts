export type EmotionType =
  | 'happy'
  | 'excited'
  | 'curious'
  | 'shy'
  | 'sleepy'
  | 'thinking'
  | 'sad'
  | 'love'
  | 'tsundere'
  | 'dizzy';

export type ActionType =
  | 'idle'
  | 'jump'
  | 'spin'
  | 'wave'
  | 'nod'
  | 'dance'
  | 'shake'
  | 'bubble'
  | 'cube'
  | 'eat'
  | 'wander'
  | 'dragged'
  | 'sleep';

export type PetSpecies = 'chubbywhale' | 'mochi' | 'cyberfox' | 'astracat' | 'custom_model';

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

export interface SystemMetrics {
  cpuUsage: number;
  memUsagePercent: number;
  memUsedGB: number;
  memTotalGB: number;
  uptimeHours: number;
}

export interface PetStatus {
  name: string;
  species: PetSpecies;
  themeId: string;
  customModelUrl: string | null;
  customModelType: 'vrm' | 'gltf' | null;
  emotion: EmotionType;
  action: ActionType;
  energy: number;       // 0 - 100
  affection: number;    // 0 - 100
  mood: number;         // 0 - 100
  satiety: number;      // 0 - 100 饱食度（大肥鱼喂食小鱼干）
  level: number;
  isSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  isDragging: boolean;  // 鼠标左键拎起拖拽状态
  autoRoam: boolean;    // 自主在屏幕边缘溜达/吐泡泡/玩魔方
  petScale: number;     // 滚轮缩放大小 (0.65 ~ 1.45)
  mouthOpen: number;    // 0.0 - 1.0 real-time audio amplitude
  speechBubble: string;
}
