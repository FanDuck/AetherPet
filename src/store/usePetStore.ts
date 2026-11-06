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
  TTSConfig,
} from '@/types/pet';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/presets';

interface PetStoreState {
  pet: PetStatus;
  llmConfig: LLMConfig;
  ttsConfig: TTSConfig;
  messages: ChatMessage[];
  settingsOpen: boolean;
  activeSettingsTab: 'llm' | 'tts' | 'appearance' | 'persona';

  // Pet State Actions
  setEmotion: (emotion: EmotionType) => void;
  triggerAction: (action: ActionType, durationMs?: number) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setMouthOpen: (val: number) => void;
  setSpeechBubble: (text: string) => void;
  setSpecies: (species: PetSpecies) => void;
  setThemeId: (themeId: string) => void;
  setPetName: (name: string) => void;
  setCustomModel: (url: string | null, type: 'vrm' | 'gltf' | null) => void;
  interactWithPet: (type: 'pat' | 'feed' | 'poke' | 'play') => {
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
        name: 'Aether (艾瑟)',
        species: 'mochi',
        themeId: 'sakura',
        customModelUrl: null,
        customModelType: null,
        emotion: 'happy',
        action: 'idle',
        energy: 92,
        affection: 78,
        mood: 95,
        level: 3,
        isSpeaking: false,
        isThinking: false,
        isListening: false,
        mouthOpen: 0,
        speechBubble: '嗨主人！摸摸我的头或者跟我聊聊天吧~ ✨',
      },

      llmConfig: {
        provider: 'deepseek',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.75,
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
        speed: 1.05,
        pitch: 1.08,
      },

      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          content: '嗨！我是你的 3D AI 灵宠 Aether~ 你可以直接点击我的身体互动，或者在下方跟我语音/文字聊天，右上角还能随时切换 DeepSeek / OpenAI 大模型与配音声线哦！',
          emotion: 'happy',
          action: 'wave',
          timestamp: Date.now(),
        },
      ],

      settingsOpen: false,
      activeSettingsTab: 'llm',

      setEmotion: (emotion) =>
        set((state) => ({ pet: { ...state.pet, emotion } })),

      triggerAction: (action, durationMs = 2600) => {
        if (actionTimeout) clearTimeout(actionTimeout);
        set((state) => ({ pet: { ...state.pet, action } }));
        if (action !== 'idle') {
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
            species: url ? 'custom_model' : 'mochi',
          },
        })),

      interactWithPet: (type) => {
        const reactions: Record<
          'pat' | 'feed' | 'poke' | 'play',
          { reply: string; emotion: EmotionType; action: ActionType; affectionDelta: number; energyDelta: number; moodDelta: number }[]
        > = {
          pat: [
            {
              reply: '呜哇~ 被主人摸头好舒服呀，好感度 +5！💕',
              emotion: 'love',
              action: 'nod',
              affectionDelta: 5,
              energyDelta: 1,
              moodDelta: 6,
            },
            {
              reply: '嘿嘿，再多揉揉我的耳朵嘛~ ✨',
              emotion: 'shy',
              action: 'shake',
              affectionDelta: 4,
              energyDelta: 0,
              moodDelta: 5,
            },
          ],
          feed: [
            {
              reply: '嗷呜嗷呜！数字星光果冻超好吃，能量瞬间满格啦！🍓',
              emotion: 'excited',
              action: 'jump',
              affectionDelta: 4,
              energyDelta: 15,
              moodDelta: 8,
            },
          ],
          poke: [
            {
              reply: '呀！别戳我软乎乎的脸颊啦，我会害羞转圈圈的！><',
              emotion: 'shy',
              action: 'spin',
              affectionDelta: 2,
              energyDelta: -1,
              moodDelta: 4,
            },
            {
              reply: '哼哼，再戳我我就要开启蹦迪模式啦！🎵',
              emotion: 'excited',
              action: 'dance',
              affectionDelta: 3,
              energyDelta: -2,
              moodDelta: 6,
            },
          ],
          play: [
            {
              reply: '来啦来啦！看我的 360 度空中螺旋律动舞步~ 🎶',
              emotion: 'excited',
              action: 'dance',
              affectionDelta: 6,
              energyDelta: -5,
              moodDelta: 10,
            },
          ],
        };

        const list = reactions[type];
        const chosen = list[Math.floor(Math.random() * list.length)];

        set((state) => {
          const newAffection = Math.min(100, Math.max(0, state.pet.affection + chosen.affectionDelta));
          const newEnergy = Math.min(100, Math.max(0, state.pet.energy + chosen.energyDelta));
          const newMood = Math.min(100, Math.max(0, state.pet.mood + chosen.moodDelta));
          const newLevel = Math.max(state.pet.level, Math.floor(newAffection / 25) + 1);
          return {
            pet: {
              ...state.pet,
              emotion: chosen.emotion,
              affection: newAffection,
              energy: newEnergy,
              mood: newMood,
              level: newLevel,
              speechBubble: chosen.reply,
            },
          };
        });

        get().triggerAction(chosen.action, 2800);
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
              content: '记忆已刷新~ 主人，我们开启新的话题吧！✨',
              emotion: 'happy',
              action: 'wave',
              timestamp: Date.now(),
            },
          ],
        })),
    }),
    {
      name: 'aetherpet-storage-v1',
      partialize: (state) => ({
        llmConfig: state.llmConfig,
        ttsConfig: state.ttsConfig,
        pet: {
          ...state.pet,
          customModelUrl: null,
          customModelType: null,
          species: state.pet.species === 'custom_model' ? 'mochi' : state.pet.species,
          isSpeaking: false,
          isThinking: false,
          isListening: false,
          mouthOpen: 0,
          action: 'idle',
        },
      }),
    }
  )
);
