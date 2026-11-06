'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Heart,
  Zap,
  Smile,
  Hand,
  Cookie,
  Sparkles,
  Music,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Cpu,
  Palette,
} from 'lucide-react';
import { usePetStore } from '@/store/usePetStore';
import { LLM_PROVIDER_PRESETS, TTS_PROVIDER_PRESETS } from '@/lib/presets';
import { parsePetResponseTag } from '@/lib/emotionParser';
import { voiceEngine } from '@/lib/voiceEngine';

const EMOTION_BADGE_MAP: Record<string, { label: string; emoji: string }> = {
  happy: { label: '开心愉悦', emoji: '😊' },
  excited: { label: '元气兴奋', emoji: '🤩' },
  curious: { label: '好奇歪头', emoji: '🧐' },
  shy: { label: '害羞脸红', emoji: '😳' },
  sleepy: { label: '困倦犯迷糊', emoji: '😴' },
  thinking: { label: '思考运转中', emoji: '🤔' },
  sad: { label: '委屈求抱抱', emoji: '🥺' },
  love: { label: '心动满满', emoji: '🥰' },
};

export default function PetHUD() {
  const pet = usePetStore((s) => s.pet);
  const llmConfig = usePetStore((s) => s.llmConfig);
  const ttsConfig = usePetStore((s) => s.ttsConfig);
  const messages = usePetStore((s) => s.messages);

  const setEmotion = usePetStore((s) => s.setEmotion);
  const triggerAction = usePetStore((s) => s.triggerAction);
  const setSpeaking = usePetStore((s) => s.setSpeaking);
  const setThinking = usePetStore((s) => s.setThinking);
  const setListening = usePetStore((s) => s.setListening);
  const setMouthOpen = usePetStore((s) => s.setMouthOpen);
  const setSpeechBubble = usePetStore((s) => s.setSpeechBubble);
  const interactWithPet = usePetStore((s) => s.interactWithPet);
  const updateTTSConfig = usePetStore((s) => s.updateTTSConfig);
  const setSettingsOpen = usePetStore((s) => s.setSettingsOpen);
  const addMessage = usePetStore((s) => s.addMessage);
  const updateMessageContent = usePetStore((s) => s.updateMessageContent);
  const clearMessages = usePetStore((s) => s.clearMessages);

  const [input, setInput] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (historyExpanded) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, historyExpanded]);

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt ?? input).trim();
    if (!text || pet.isThinking) return;

    if (!customPrompt) setInput('');
    voiceEngine.stopAll(setMouthOpen, setSpeaking);

    addMessage({ role: 'user', content: text });
    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '...',
      emotion: 'thinking',
    });

    setThinking(true);
    setSpeechBubble('正在思考主人的话... ✨');

    try {
      const historyPayload = [
        ...messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: text },
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          llmConfig,
          petName: pet.name,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          errData.error || `请求失败 (${res.status})，请检查右上角 API Key 配置`;
        setThinking(false);
        setEmotion('sad');
        setSpeechBubble(errMsg);
        updateMessageContent(assistantMsgId, errMsg, 'sad', 'shake');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('ReadableStream 不可用');

      const decoder = new TextDecoder();
      let buffer = '';
      let rawAccumulated = '';
      let triggeredTag = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '').trim();
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              rawAccumulated += parsed.content;
              const { cleanText, emotion, action } =
                parsePetResponseTag(rawAccumulated);

              if (!triggeredTag && (emotion || action)) {
                triggeredTag = true;
                if (emotion) setEmotion(emotion);
                if (action && action !== 'idle') triggerAction(action, 3200);
              }

              if (cleanText) {
                setSpeechBubble(cleanText);
                updateMessageContent(assistantMsgId, cleanText, emotion, action);
              }
            }
          } catch {
            // ignore chunk error
          }
        }
      }

      setThinking(false);
      const finalParsed = parsePetResponseTag(rawAccumulated);
      const finalReply = finalParsed.cleanText || rawAccumulated;

      if (finalParsed.emotion) setEmotion(finalParsed.emotion);
      if (finalParsed.action && finalParsed.action !== 'idle') {
        triggerAction(finalParsed.action, 3200);
      }

      setSpeechBubble(finalReply);
      updateMessageContent(
        assistantMsgId,
        finalReply,
        finalParsed.emotion,
        finalParsed.action
      );

      // Speak with TTS & Real-time Lip Sync
      if (ttsConfig.enabled && ttsConfig.autoPlay && finalReply) {
        voiceEngine.speak(finalReply, ttsConfig, {
          onMouthChange: setMouthOpen,
          onSpeakingChange: setSpeaking,
        });
      }
    } catch (err) {
      setThinking(false);
      const msg = `网络开小差啦: ${(err as Error).message}`;
      setSpeechBubble(msg);
      updateMessageContent(assistantMsgId, msg, 'sad');
    }
  };

  // Browser Web Speech Recognition (ASR)
  const toggleVoiceInput = () => {
    if (pet.isListening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechBubble('当前浏览器不支持原生麦克风语音识别，请使用 Chrome 或 Edge 哦~');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setSpeechBubble('正在竖起耳朵听主人说话... 🎤');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
        handleSend(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleQuickInteract = (type: 'pat' | 'feed' | 'poke' | 'play') => {
    const res = interactWithPet(type);
    if (ttsConfig.enabled && ttsConfig.autoPlay) {
      voiceEngine.speak(res.reply, ttsConfig, {
        onMouthChange: setMouthOpen,
        onSpeakingChange: setSpeaking,
      });
    }
  };

  const emotionBadge =
    EMOTION_BADGE_MAP[pet.emotion] || EMOTION_BADGE_MAP.happy;
  const activeLLMName =
    LLM_PROVIDER_PRESETS[llmConfig.provider]?.name.split(' ')[0] ||
    llmConfig.provider;
  const activeTTSName =
    TTS_PROVIDER_PRESETS[ttsConfig.provider]?.name.split(' ')[0] ||
    ttsConfig.provider;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      {/* TOP BAR: Pet Vitals & Engine Status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: Pet Identity & Vital Bars */}
        <div className="pointer-events-auto flex flex-col gap-2.5 rounded-3xl border border-white/15 bg-black/45 backdrop-blur-xl px-4 py-3 text-white shadow-2xl min-w-[250px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/80 to-violet-600/80 text-lg shadow-md">
                {emotionBadge.emoji}
                {pet.isSpeaking && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-wide">{pet.name}</h1>
                  <span className="rounded-full bg-pink-500/25 border border-pink-400/30 px-2 py-0.5 text-[10px] font-semibold text-pink-200">
                    Lv.{pet.level}
                  </span>
                </div>
                <p className="text-[11px] text-white/60">
                  状态：{emotionBadge.label}
                  {pet.isSpeaking ? ' · 正在说话 🎵' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Mini Vital Bars */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-[11px]">
            <div>
              <div className="flex items-center justify-between text-pink-300 mb-1">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" /> 羁绊
                </span>
                <span>{pet.affection}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-500"
                  style={{ width: `${pet.affection}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-amber-300 mb-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" /> 能量
                </span>
                <span>{pet.energy}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                  style={{ width: `${pet.energy}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-cyan-300 mb-1">
                <span className="flex items-center gap-1">
                  <Smile className="w-3 h-3" /> 心情
                </span>
                <span>{pet.mood}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 transition-all duration-500"
                  style={{ width: `${pet.mood}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Floating Speech Bubble above Pet */}
        <div className="pointer-events-auto mx-auto order-3 lg:order-2 w-full max-w-lg flex justify-center mt-1">
          {pet.speechBubble && (
            <div className="relative animate-float rounded-3xl border border-white/20 bg-black/55 backdrop-blur-xl px-5 py-3.5 text-sm leading-relaxed text-white shadow-2xl">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0 mt-1" />
                <div className="flex-1 break-words">{pet.speechBubble}</div>
                {pet.isSpeaking && (
                  <div className="flex items-end gap-0.5 h-4 shrink-0 self-center ml-1">
                    <span
                      className="w-1 bg-pink-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(25, pet.mouthOpen * 100)}%` }}
                    />
                    <span
                      className="w-1 bg-violet-400 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(35, ((pet.mouthOpen * 1.3) % 1) * 100)}%`,
                      }}
                    />
                    <span
                      className="w-1 bg-cyan-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(20, pet.mouthOpen * 85)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Engine Pills & Settings Trigger */}
        <div className="pointer-events-auto order-2 lg:order-3 flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true, 'llm')}
            className="hidden sm:flex items-center gap-1.5 rounded-2xl border border-white/15 bg-black/45 backdrop-blur-xl px-3.5 py-2 text-xs text-white/85 hover:bg-white/10 transition"
            title="点击切换大模型 API"
          >
            <Cpu className="w-3.5 h-3.5 text-pink-400" />
            <span>{activeLLMName}</span>
            <span className="text-white/40">·</span>
            <span className="text-pink-300 font-mono text-[11px]">
              {llmConfig.model.split('/').pop()}
            </span>
          </button>

          <button
            onClick={() => setSettingsOpen(true, 'appearance')}
            className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-black/45 backdrop-blur-xl px-3 py-2 text-xs text-white/85 hover:bg-white/10 transition"
            title="切换 3D 宠物形象或导入 VRM"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">换装 / VRM</span>
          </button>

          <button
            onClick={() => updateTTSConfig({ enabled: !ttsConfig.enabled })}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs backdrop-blur-xl transition ${
              ttsConfig.enabled
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                : 'border-white/15 bg-black/45 text-white/50'
            }`}
            title={`当前配音: ${activeTTSName}`}
          >
            {ttsConfig.enabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden md:inline">
              {ttsConfig.enabled ? activeTTSName : '静音'}
            </span>
          </button>

          <button
            onClick={() => setSettingsOpen(true, 'llm')}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-pink-500/25 hover:opacity-95 transition"
          >
            <Settings className="w-4 h-4" />
            <span>引擎配置</span>
          </button>
        </div>
      </div>

      {/* MIDDLE RIGHT: Floating 3D Interactive Action Dock */}
      <div className="pointer-events-auto self-end my-auto flex flex-col gap-2 rounded-3xl border border-white/15 bg-black/45 backdrop-blur-xl p-2 text-white shadow-2xl">
        <button
          onClick={() => handleQuickInteract('pat')}
          className="group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs hover:bg-pink-500/20 transition"
          title="摸摸头 (+好感度)"
        >
          <Hand className="w-4 h-4 text-pink-400 group-hover:scale-110 transition" />
          <span className="hidden sm:inline">摸摸头</span>
        </button>
        <button
          onClick={() => handleQuickInteract('feed')}
          className="group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs hover:bg-amber-500/20 transition"
          title="投喂星光果冻 (+能量)"
        >
          <Cookie className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          <span className="hidden sm:inline">投喂零食</span>
        </button>
        <button
          onClick={() => handleQuickInteract('poke')}
          className="group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs hover:bg-cyan-500/20 transition"
          title="戳戳脸颊 (360度转圈)"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          <span className="hidden sm:inline">戳戳脸颊</span>
        </button>
        <button
          onClick={() => handleQuickInteract('play')}
          className="group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs hover:bg-violet-500/20 transition"
          title="让宠物跳支舞"
        >
          <Music className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          <span className="hidden sm:inline">开心跳舞</span>
        </button>
      </div>

      {/* BOTTOM DOCK: Expandable Chat History + Input Bar */}
      <div className="pointer-events-auto mx-auto w-full max-w-2xl flex flex-col gap-2">
        {/* Collapsible Chat Drawer */}
        {historyExpanded && (
          <div className="rounded-3xl border border-white/15 bg-black/65 backdrop-blur-2xl p-4 text-white shadow-2xl max-h-60 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs text-white/50">
              <span>对话记忆 ({messages.length} 条)</span>
              <button
                onClick={clearMessages}
                className="flex items-center gap-1 text-white/50 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> 清空记忆
              </button>
            </div>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-pink-500/80 text-white'
                      : 'bg-white/10 text-white/90 border border-white/10'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* Quick Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            '给我跳支元气满满的舞吧！💃',
            '用可爱的声音夸夸我~ ✨',
            '转个圈圈给我看！🌀',
            '今天工作有点累，求安慰 🥺',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="shrink-0 rounded-full border border-white/15 bg-black/45 backdrop-blur-md px-3 py-1 text-[11px] text-white/75 hover:bg-pink-500/25 hover:border-pink-400/40 hover:text-white transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Main Input Bar */}
        <div className="flex items-center gap-2 rounded-3xl border border-white/20 bg-black/55 backdrop-blur-2xl p-2 shadow-2xl">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex items-center gap-1 rounded-2xl bg-white/5 hover:bg-white/15 px-3 py-2.5 text-xs text-white/75 transition"
            title="展开/收起对话记录"
          >
            <MessageSquare className="w-4 h-4 text-pink-400" />
            {historyExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={toggleVoiceInput}
            className={`rounded-2xl p-2.5 transition ${
              pet.isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white/5 hover:bg-white/15 text-white/75'
            }`}
            title="语音对讲 (浏览器麦克风识别)"
          >
            {pet.isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={`跟 ${pet.name} 说点什么吧... (直接点击 3D 宠物身体也能互动哦)`}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-white/40 focus:outline-none"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || pet.isThinking}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/25 disabled:opacity-40 hover:opacity-95 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {pet.isThinking ? '思考中' : '发送'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
