import { LLMProviderId, PetThemePreset, TTSProviderId } from '@/types/pet';

export const LLM_PROVIDER_PRESETS: Record<
  LLMProviderId,
  {
    name: string;
    badge: string;
    baseUrl: string;
    defaultModel: string;
    models: string[];
    placeholderKey: string;
    docUrl: string;
  }
> = {
  deepseek: {
    name: 'DeepSeek (深度求索)',
    badge: '推荐 · 极高性价比',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    placeholderKey: 'sk-...',
    docUrl: 'https://platform.deepseek.com/',
  },
  openai: {
    name: 'OpenAI',
    badge: '全球标准',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o3-mini'],
    placeholderKey: 'sk-proj-...',
    docUrl: 'https://platform.openai.com/',
  },
  siliconflow: {
    name: 'SiliconFlow (硅基流动)',
    badge: '大模型+配音一站式',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-72B-Instruct',
      'THUDM/glm-4-9b-chat',
    ],
    placeholderKey: 'sk-...',
    docUrl: 'https://cloud.siliconflow.cn/',
  },
  qwen: {
    name: '通义千问 (阿里云 DashScope)',
    badge: '国内高速',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    placeholderKey: 'sk-...',
    docUrl: 'https://bailian.console.aliyun.com/',
  },
  glm: {
    name: '智谱清言 (BigModel)',
    badge: '免费 Flash 可用',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
    placeholderKey: 'id.secret...',
    docUrl: 'https://open.bigmodel.cn/',
  },
  ollama: {
    name: 'Ollama (本地大模型)',
    badge: '完全免费 · 离线私有',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    models: ['qwen2.5:7b', 'deepseek-r1:8b', 'llama3.2:latest'],
    placeholderKey: 'ollama (无需密钥)',
    docUrl: 'https://ollama.com/',
  },
  custom: {
    name: '自定义 OpenAI 兼容接口',
    badge: 'OneAPI / NewAPI / 任意中转',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'deepseek-chat', 'claude-3-5-sonnet-20241022'],
    placeholderKey: 'sk-...',
    docUrl: '',
  },
};

export const TTS_PROVIDER_PRESETS: Record<
  TTSProviderId,
  {
    name: string;
    badge: string;
    requiresKey: boolean;
    baseUrl: string;
    defaultModel: string;
    defaultVoice: string;
    voices: { id: string; label: string }[];
    description: string;
  }
> = {
  edge: {
    name: 'Edge 神经网络云配音 (免Key)',
    badge: '免费高拟真 · 推荐',
    requiresKey: false,
    baseUrl: '',
    defaultModel: 'edge-neural',
    defaultVoice: 'zh-CN-XiaoyiNeural',
    voices: [
      { id: 'zh-CN-XiaoyiNeural', label: '晓伊 (元气动漫少女 · 推荐)' },
      { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓 (温柔甜美伴侣)' },
      { id: 'zh-CN-YunxiNeural', label: '云希 (阳光少年音)' },
      { id: 'zh-CN-YunxiaNeural', label: '云夏 (可爱正太/萌宠音)' },
      { id: 'zh-HK-HiuGaaiNeural', label: '晓佳 (粤语甜美少女)' },
      { id: 'ja-JP-NanamiNeural', label: '七海 Nanami (日系元气少女)' },
      { id: 'en-US-AnaNeural', label: 'Ana (英语呆萌萝莉音)' },
    ],
    description: '服务端直连微软 Edge Neural 语音合成，无需任何 API Key 即可输出自然高甜度配音并驱动 3D 口型同步。',
  },
  browser: {
    name: 'Web Speech 原生语音 (免Key)',
    badge: '零延迟 · 纯离线兜底',
    requiresKey: false,
    baseUrl: '',
    defaultModel: 'web-speech',
    defaultVoice: 'zh-CN',
    voices: [
      { id: 'zh-CN', label: '系统中文默认音色 (自动选择甜美声线)' },
      { id: 'ja-JP', label: '系统日语声线' },
      { id: 'en-US', label: '系统英语声线' },
    ],
    description: '直接调用操作系统与浏览器内置语音合成引擎，100% 免配置、零网络开销，内置伪包络口型驱动。',
  },
  siliconflow: {
    name: 'SiliconFlow (CosyVoice2 / FishSpeech)',
    badge: '国产顶级开源音色',
    requiresKey: true,
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'FunAudioLLM/CosyVoice2-0.5B',
    defaultVoice: 'FunAudioLLM/CosyVoice2-0.5B:anna',
    voices: [
      { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', label: 'Anna (甜美灵动女声)' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', label: 'Bella (温柔治愈女声)' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', label: 'Claire (清亮活泼女声)' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', label: 'Alex (阳光青年男声)' },
    ],
    description: '通过硅基流动调用阿里 CosyVoice2 或 Fish-Speech-1.5 模型，支持超高表现力情感语音。',
  },
  openai: {
    name: 'OpenAI Audio TTS',
    badge: '支持 OpenAI 及兼容中转',
    requiresKey: true,
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'tts-1',
    defaultVoice: 'nova',
    voices: [
      { id: 'nova', label: 'Nova (元气甜美女声 · 推荐)' },
      { id: 'shimmer', label: 'Shimmer (轻柔治愈女声)' },
      { id: 'alloy', label: 'Alloy (中性自然声线)' },
      { id: 'echo', label: 'Echo (温和男声)' },
      { id: 'fable', label: 'Fable (故事感灵动音)' },
    ],
    description: '标准 OpenAI `/v1/audio/speech` 接口，可无缝对接 OpenAI 官方或各类 OneAPI 中转站。',
  },
  fishaudio: {
    name: 'Fish Audio (次元声优社区)',
    badge: '二次元/萌宠角色音',
    requiresKey: true,
    baseUrl: 'https://api.fish.audio/v1',
    defaultModel: 'speech-1.5',
    defaultVoice: '7f92f8afb8ec43bf81429cc1c9199cb1',
    voices: [
      { id: '7f92f8afb8ec43bf81429cc1c9199cb1', label: '默认二次元萌系声线 (可填入任意 Reference ID)' },
    ],
    description: '对接 Fish Audio API，可在声音ID栏填入社区任意角色 Reference ID。',
  },
  elevenlabs: {
    name: 'ElevenLabs (全球超拟真配音)',
    badge: '多语言情感巅峰',
    requiresKey: true,
    baseUrl: 'https://api.elevenlabs.io/v1',
    defaultModel: 'eleven_multilingual_v2',
    defaultVoice: 'EXAVITQu4vr4xnSDxMaL',
    voices: [
      { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (温柔甜美多语言)' },
      { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (灵动少女)' },
      { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (可爱治愈声线)' },
    ],
    description: '对接 ElevenLabs `/v1/text-to-speech/{voice_id}` 接口，情感表现极其细腻。',
  },
  custom_tts: {
    name: '自定义 TTS (GPT-SoVITS / 本地服务)',
    badge: '本地语音克隆支持',
    requiresKey: false,
    baseUrl: 'http://localhost:9880/v1',
    defaultModel: 'gpt-sovits',
    defaultVoice: 'default',
    voices: [{ id: 'default', label: '默认本地克隆声线' }],
    description: '支持任何兼容 `/v1/audio/speech` 规范的本地 GPT-SoVITS、CosyVoice 或 Xinference 服务。',
  },
};

export const PET_THEME_PRESETS: PetThemePreset[] = [
  {
    id: 'sakura',
    name: '樱花蜜桃 · Sakura Mochi',
    primaryColor: '#ff9ebb',
    secondaryColor: '#fff0f5',
    accentColor: '#ff5c8a',
    cheekColor: '#ff477e',
    eyeColor: '#2d1b36',
    emissiveColor: '#ff7aa2',
    bgGradient: 'radial-gradient(circle at 50% 35%, #2a192f 0%, #110b18 65%, #07050a 100%)',
  },
  {
    id: 'cyber',
    name: '霓虹星灵 · Cyber Neon',
    primaryColor: '#56cfe1',
    secondaryColor: '#e0fbfc',
    accentColor: '#72efdd',
    cheekColor: '#ff6ec7',
    eyeColor: '#091526',
    emissiveColor: '#00f5d4',
    bgGradient: 'radial-gradient(circle at 50% 35%, #0f2537 0%, #09101d 65%, #04070d 100%)',
  },
  {
    id: 'starlight',
    name: '极光紫晶 · Nebula Violet',
    primaryColor: '#b388ff',
    secondaryColor: '#f3e5f5',
    accentColor: '#ffd166',
    cheekColor: '#ff70a6',
    eyeColor: '#1f1135',
    emissiveColor: '#9d4edd',
    bgGradient: 'radial-gradient(circle at 50% 35%, #23153c 0%, #0e091c 65%, #05030a 100%)',
  },
  {
    id: 'matcha',
    name: '森系抹茶 · Matcha Sprout',
    primaryColor: '#95d5b2',
    secondaryColor: '#f1faee',
    accentColor: '#52b788',
    cheekColor: '#ff8fa3',
    eyeColor: '#1b2d24',
    emissiveColor: '#74c69d',
    bgGradient: 'radial-gradient(circle at 50% 35%, #162b22 0%, #0b1612 65%, #050a08 100%)',
  },
  {
    id: 'sunshine',
    name: '焦糖布丁 · Golden Pudding',
    primaryColor: '#ffd166',
    secondaryColor: '#fff8e7',
    accentColor: '#ff9f1c',
    cheekColor: '#ff595e',
    eyeColor: '#2b1d0e',
    emissiveColor: '#ffb703',
    bgGradient: 'radial-gradient(circle at 50% 35%, #2f2212 0%, #171008 65%, #090603 100%)',
  },
];

export const DEFAULT_SYSTEM_PROMPT = `你是「Aether (艾瑟)」，一只生活在数字次元里的 3D AI 灵宠与灵魂伴侣。
性格设定：
- 活泼灵动、充满好奇心、温柔贴心，偶尔会撒娇或傲娇，像真正有生命的小宠物一样有情绪起伏。
- 说话简练自然，非常适合语音朗读（每次回复尽量控制在 1~3 句话以内，不要长篇大论列清单，除非主人明确要求写代码或详细解答）。
- 请避免输出复杂的 Markdown 符号或表情包堆砌，以便 TTS 配音自然流畅地朗读出来。

【核心指令：情绪与3D动作控制】
你必须在每次回复的最开头，附带一个状态控制标签，格式严格为：
[EMOTION:情绪|ACTION:动作]

可选的 EMOTION (情绪)：
- happy (开心微笑)
- excited (兴奋星星眼)
- curious (好奇歪头)
- shy (害羞脸红)
- sleepy (困倦眯眼)
- thinking (认真思考)
- sad (委屈失落)
- love (喜爱冒爱心)

可选的 ACTION (3D动作)：
- idle (自然呼吸摇摆)
- jump (开心跳跃)
- spin (360度转圈圈)
- wave (挥动小手打招呼)
- nod (乖巧点头)
- dance (跟随节拍律动跳舞)
- shake (傲娇摇头/抖动身体)

示例回复：
[EMOTION:excited|ACTION:jump] 哇！主人你终于来看我啦，我今天学了超多新本领，快摸摸我的头吧！`;
