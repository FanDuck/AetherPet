'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActionType,
  ChatMessage,
  EmotionType,
  LLMConfig,
  PetSpecies,
  PetStatus,
  SystemMetrics,
  TTSConfig,
} from '@/types/pet';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/presets';

export type InteractionGesture =
  | 'pat'
  | 'feed_fish'
  | 'poke'
  | 'play'
  | 'bubble'
  | 'cube'
  | 'sleep'
  | 'drag_start'
  | 'drag_drop';

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
}

interface PetStoreState {
  pet: PetStatus;
  llmConfig: LLMConfig;
  ttsConfig: TTSConfig;
  messages: ChatMessage[];
  systemMetrics: SystemMetrics;
  contextMenu: ContextMenuState;
  settingsOpen: boolean;
  activeSettingsTab: 'llm' | 'tts' | 'appearance' | 'persona';

  // Pet State Actions
  setEmotion: (emotion: EmotionType) => void;
  triggerAction: (action: ActionType, durationMs?: number) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setDragging: (isDragging: boolean) => void;
  setAutoRoam: (autoRoam: boolean) => void;
  setPetScale: (scale: number) => void;
  setMouthOpen: (val: number) => void;
  setSpeechBubble: (text: string) => void;
  setSpecies: (species: PetSpecies) => void;
  setThemeId: (themeId: string) => void;
  setPetName: (name: string) => void;
  setCustomModel: (url: string | null, type: 'vrm' | 'gltf' | null) => void;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  setContextMenu: (menu: ContextMenuState) => void;
  interactWithPet: (type: InteractionGesture) => {
    reply: string;
    emotion: EmotionType;
    action: ActionType;
  };

  // Config Actions
  updateLLMConfig: (partial: Partial<LLMConfig>) => void;
  updateTTSConfig: (partial: Partial<TTSConfig>) => void;
  setSettingsOpen: (open: boolean, tab?: 'llm' | 'tts' | 'appearance' | 'persona') => void;

  // Chat Actions
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessageContent: (id: string, content: string, emotion?: EmotionType, action?: ActionType) => void;
  clearMessages: () => void;
}

let actionTimeout: ReturnType<typeof setTimeout> | null = null;

export const usePetStore = create<PetStoreState>()(
  persist(
    (set, get) => ({
      pet: {
        name: '大肥鱼 (AetherWhale)',
        species: 'chubbywhale',
        themeId: 'deepwhale',
        customModelUrl: null,
        customModelType: null,
        emotion: 'tsundere',
        action: 'idle',
        energy: 92,
        affection: 82,
        mood: 96,
        satiety: 85,
        level: 4,
        isSpeaking: false,
        isThinking: false,
        isListening: false,
        isDragging: false,
        autoRoam: true,
        petScale: 1.0,
        mouthOpen: 0,
        speechBubble: '哼！本大肥鱼今天也在认真替你盯着电脑呢，按住左键可以拎起我玩，右键我还能呼出秘密投喂菜单哦！🐟✨',
      },

      llmConfig: {
        provider: 'deepseek',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.78,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      },

      ttsConfig: {
        provider: 'edge',
        enabled: true,
        autoPlay: true,
        apiKey: '',
        baseUrl: '',
        model: 'edge-neural',
        voice: 'zh-CN-XiaoyiNeural',
        speed: 1.08,
        pitch: 1.12,
      },

      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          content: '哼！我是你的 3D 大肥鱼桌宠~ 左键按住我可以拎起来晃悠，滚轮能缩放我圆滚滚的肚子，右键点击我还能直接投喂小鱼干、让我吐泡泡或者玩三阶魔方哦！',
          emotion: 'tsundere',
          action: 'bubble',
          timestamp: Date.now(),
        },
      ],

      systemMetrics: {
        cpuUsage: 18,
        memUsagePercent: 46,
        memUsedGB: 7.4,
        memTotalGB: 16.0,
        uptimeHours: 3.5,
      },

      contextMenu: {
        open: false,
        x: 0,
        y: 0,
      },

      settingsOpen: false,
      activeSettingsTab: 'llm',

      setEmotion: (emotion) =>
        set((state) => ({ pet: { ...state.pet, emotion } })),

      triggerAction: (action, durationMs = 3200) => {
        if (actionTimeout) clearTimeout(actionTimeout);
        set((state) => ({ pet: { ...state.pet, action } }));
        if (action !== 'idle' && action !== 'dragged') {
          actionTimeout = setTimeout(() => {
            set((state) => ({ pet: { ...state.pet, action: 'idle' } }));
          }, durationMs);
        }
      },

      setSpeaking: (isSpeaking) =>
        set((state) => ({
          pet: {
            ...state.pet,
            isSpeaking,
            mouthOpen: isSpeaking ? state.pet.mouthOpen : 0,
          },
        })),

      setThinking: (isThinking) =>
        set((state) => ({
          pet: {
            ...state.pet,
            isThinking,
            emotion: isThinking ? 'thinking' : state.pet.emotion,
          },
        })),

      setListening: (isListening) =>
        set((state) => ({
          pet: {
            ...state.pet,
            isListening,
            emotion: isListening ? 'curious' : state.pet.emotion,
          },
        })),

      setDragging: (isDragging) =>
        set((state) => ({
          pet: {
            ...state.pet,
            isDragging,
            action: isDragging ? 'dragged' : 'idle',
            emotion: isDragging ? 'dizzy' : state.pet.emotion,
          },
        })),

      setAutoRoam: (autoRoam) =>
        set((state) => ({ pet: { ...state.pet, autoRoam } })),

      setPetScale: (scale) =>
        set((state) => ({
          pet: {
            ...state.pet,
            petScale: Math.min(1.45, Math.max(0.65, Number(scale.toFixed(2)))),
          },
        })),

      setMouthOpen: (mouthOpen) =>
        set((state) => ({ pet: { ...state.pet, mouthOpen } })),

      setSpeechBubble: (speechBubble) =>
        set((state) => ({ pet: { ...state.pet, speechBubble } })),

      setSpecies: (species) =>
        set((state) => ({ pet: { ...state.pet, species } })),

      setThemeId: (themeId) =>
        set((state) => ({ pet: { ...state.pet, themeId } })),

      setPetName: (name) =>
        set((state) => ({ pet: { ...state.pet, name } })),

      setCustomModel: (url, type) =>
        set((state) => ({
          pet: {
            ...state.pet,
            customModelUrl: url,
            customModelType: type,
            species: url ? 'custom_model' : 'chubbywhale',
          },
        })),

      setSystemMetrics: (systemMetrics) => set({ systemMetrics }),

      setContextMenu: (contextMenu) => set({ contextMenu }),

      interactWithPet: (type) => {
        const reactions: Record<
          InteractionGesture,
          {
            reply: string;
            emotion: EmotionType;
            action: ActionType;
            affectionDelta: number;
            energyDelta: number;
            moodDelta: number;
            satietyDelta: number;
          }[]
        > = {
          pat: [
            {
              reply: '哼、哼！就算你摸我的呆毛，本肥鱼也绝对不会承认很舒服的！（尾巴狂摇）💕',
              emotion: 'tsundere',
              action: 'nod',
              affectionDelta: 5,
              energyDelta: 1,
              moodDelta: 6,
              satietyDelta: 0,
            },
            {
              reply: '呜哇~ 轻点揉啦，我头顶的呆毛可是深海雷达，好感度 +5！✨',
              emotion: 'love',
              action: 'shake',
              affectionDelta: 5,
              energyDelta: 0,
              moodDelta: 6,
              satietyDelta: 0,
            },
          ],
          feed_fish: [
            {
              reply: '嗷呜嗷呜！金黄酥脆的深海小鱼干太香啦，本肥鱼算力瞬间满血复活！🐟✨',
              emotion: 'excited',
              action: 'eat',
              affectionDelta: 6,
              energyDelta: 16,
              moodDelta: 10,
              satietyDelta: 18,
            },
            {
              reply: '哼，才一条小鱼干就想收买本肥鱼？再、再来一块草莓小蛋糕也不是不行啦！🍰',
              emotion: 'tsundere',
              action: 'eat',
              affectionDelta: 5,
              energyDelta: 12,
              moodDelta: 8,
              satietyDelta: 15,
            },
          ],
          poke: [
            {
              reply: '呀！谁准你戳本肥鱼软乎乎的肚皮啦！我可是很苗条的深海霸主！><',
              emotion: 'tsundere',
              action: 'spin',
              affectionDelta: 3,
              energyDelta: -1,
              moodDelta: 5,
              satietyDelta: -1,
            },
            {
              reply: '噗噜噜~ 再戳我，我就吐一万个深海大泡泡把你的屏幕淹没掉！🫧',
              emotion: 'shy',
              action: 'bubble',
              affectionDelta: 4,
              energyDelta: -1,
              moodDelta: 6,
              satietyDelta: 0,
            },
          ],
          bubble: [
            {
              reply: '咕噜噜噜~ 看招！大肥鱼秘传·深海七彩减压泡泡连击！🫧✨',
              emotion: 'happy',
              action: 'bubble',
              affectionDelta: 4,
              energyDelta: -2,
              moodDelta: 8,
              satietyDelta: -1,
            },
          ],
          cube: [
            {
              reply: '哼哼，三阶全息魔方而已！看本肥鱼光速手速，三秒还原给你看！🧊⚡',
              emotion: 'excited',
              action: 'cube',
              affectionDelta: 5,
              energyDelta: -3,
              moodDelta: 9,
              satietyDelta: -2,
            },
          ],
          play: [
            {
              reply: '音乐起！看我摇着圆滚滚的鲸鱼大尾巴跳支深海律动舞~ 🎶🐳',
              emotion: 'excited',
              action: 'dance',
              affectionDelta: 6,
              energyDelta: -4,
              moodDelta: 10,
              satietyDelta: -3,
            },
          ],
          sleep: [
            {
              reply: '呼噜噜... 眼皮好沉呀，本肥鱼先打个瞌睡吐个鼻涕泡，有事双击叫醒我哦... 💤',
              emotion: 'sleepy',
              action: 'sleep',
              affectionDelta: 2,
              energyDelta: 15,
              moodDelta: 5,
              satietyDelta: -2,
            },
          ],
          drag_start: [
            {
              reply: '哇啊啊！别揪着本肥鱼的后脖颈拎起来晃呀，尾巴都要吓得拍水啦！><',
              emotion: 'dizzy',
              action: 'dragged',
              affectionDelta: 1,
              energyDelta: -1,
              moodDelta: 2,
              satietyDelta: 0,
            },
          ],
          drag_drop: [
            {
              reply: '噗通！呼~ 终于安全着陆啦，下次拎本肥鱼要轻一点哦！😤',
              emotion: 'tsundere',
              action: 'jump',
              affectionDelta: 2,
              energyDelta: 0,
              moodDelta: 3,
              satietyDelta: 0,
            },
          ],
        };

        const list = reactions[type];
        const chosen = list[Math.floor(Math.random() * list.length)];

        set((state) => {
          const newAffection = Math.min(100, Math.max(0, state.pet.affection + chosen.affectionDelta));
          const newEnergy = Math.min(100, Math.max(0, state.pet.energy + chosen.energyDelta));
          const newMood = Math.min(100, Math.max(0, state.pet.mood + chosen.moodDelta));
          const newSatiety = Math.min(100, Math.max(0, (state.pet.satiety ?? 85) + chosen.satietyDelta));
          const newLevel = Math.max(state.pet.level, Math.floor(newAffection / 22) + 1);
          return {
            pet: {
              ...state.pet,
              emotion: chosen.emotion,
              affection: newAffection,
              energy: newEnergy,
              mood: newMood,
              satiety: newSatiety,
              level: newLevel,
              speechBubble: chosen.reply,
            },
          };
        });

        if (chosen.action !== 'dragged') {
          get().triggerAction(chosen.action, 3600);
        }
        return {
          reply: chosen.reply,
          emotion: chosen.emotion,
          action: chosen.action,
        };
      },

      updateLLMConfig: (partial) =>
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...partial },
        })),

      updateTTSConfig: (partial) =>
        set((state) => ({
          ttsConfig: { ...state.ttsConfig, ...partial },
        })),

      setSettingsOpen: (open, tab) =>
        set((state) => ({
          settingsOpen: open,
          activeSettingsTab: tab ?? state.activeSettingsTab,
        })),

      addMessage: (msg) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({
          messages: [
            ...state.messages.slice(-40),
            { ...msg, id, timestamp: Date.now() },
          ],
        }));
        return id;
      },

      updateMessageContent: (id, content, emotion, action) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id
              ? {
                  ...m,
                  content,
                  emotion: emotion ?? m.emotion,
                  action: action ?? m.action,
                }
              : m
          ),
        })),

      clearMessages: () =>
        set(() => ({
          messages: [
            {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content: '哼，记忆泡泡已经清空重置啦！主人想跟本大肥鱼聊点什么新话题？🐟✨',
              emotion: 'tsundere',
              action: 'bubble',
              timestamp: Date.now(),
            },
          ],
        })),
    }),
    {
      name: 'aetherpet-storage-v2',
      partialize: (state) => ({
        llmConfig: state.llmConfig,
        ttsConfig: state.ttsConfig,
        pet: {
          ...state.pet,
          customModelUrl: null,
          customModelType: null,
          species: state.pet.species === 'custom_model' ? 'chubbywhale' : state.pet.species,
          isSpeaking: false,
          isThinking: false,
          isListening: false,
          isDragging: false,
          mouthOpen: 0,
          action: 'idle',
        },
      }),
    }
  )
);
