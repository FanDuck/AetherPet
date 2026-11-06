'use client';

import React, { useRef } from 'react';
import {
  X,
  Cpu,
  Volume2,
  Palette,
  Sparkles,
  Upload,
  Check,
  Play,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { usePetStore } from '@/store/usePetStore';
import {
  DEFAULT_SYSTEM_PROMPT,
  LLM_PROVIDER_PRESETS,
  PET_THEME_PRESETS,
  TTS_PROVIDER_PRESETS,
} from '@/lib/presets';
import { LLMProviderId, PetSpecies, TTSProviderId } from '@/types/pet';
import { voiceEngine } from '@/lib/voiceEngine';

export default function SettingsModal() {
  const settingsOpen = usePetStore((s) => s.settingsOpen);
  const activeTab = usePetStore((s) => s.activeSettingsTab);
  const setSettingsOpen = usePetStore((s) => s.setSettingsOpen);

  const pet = usePetStore((s) => s.pet);
  const setSpecies = usePetStore((s) => s.setSpecies);
  const setThemeId = usePetStore((s) => s.setThemeId);
  const setPetName = usePetStore((s) => s.setPetName);
  const setCustomModel = usePetStore((s) => s.setCustomModel);
  const setMouthOpen = usePetStore((s) => s.setMouthOpen);
  const setSpeaking = usePetStore((s) => s.setSpeaking);

  const llmConfig = usePetStore((s) => s.llmConfig);
  const updateLLMConfig = usePetStore((s) => s.updateLLMConfig);

  const ttsConfig = usePetStore((s) => s.ttsConfig);
  const updateTTSConfig = usePetStore((s) => s.updateTTSConfig);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!settingsOpen) return null;

  const currentLLMPreset = LLM_PROVIDER_PRESETS[llmConfig.provider];
  const currentTTSPreset = TTS_PROVIDER_PRESETS[ttsConfig.provider];

  const handleSelectLLMProvider = (provider: LLMProviderId) => {
    const preset = LLM_PROVIDER_PRESETS[provider];
    updateLLMConfig({
      provider,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
    });
  };

  const handleSelectTTSProvider = (provider: TTSProviderId) => {
    const preset = TTS_PROVIDER_PRESETS[provider];
    updateTTSConfig({
      provider,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      voice: preset.defaultVoice,
    });
  };

  const handleTestVoice = () => {
    voiceEngine.speak(
      `嗨主人！我是你的 3D AI 灵宠 ${pet.name}，现在正在测试实时配音和口型同步效果哟！`,
      ttsConfig,
      {
        onMouthChange: setMouthOpen,
        onSpeakingChange: setSpeaking,
      }
    );
  };

  const handleModelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const url = URL.createObjectURL(file);
    setCustomModel(url, ext === 'vrm' ? 'vrm' : 'gltf');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl border border-white/15 bg-[#120e1c]/95 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">
                AetherPet 开源引擎配置中心
              </h2>
              <p className="text-xs text-white/50">
                支持热插拔切换 DeepSeek / OpenAI 等大模型与多源 TTS 语音合成
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-black/20 px-6 gap-2 overflow-x-auto">
          {[
            { id: 'llm', label: '大模型 API (LLM)', icon: Cpu },
            { id: 'tts', label: '配音与声线 (TTS)', icon: Volume2 },
            { id: 'appearance', label: '3D 形态与 VRM 导入', icon: Palette },
            { id: 'persona', label: '灵魂人设 Prompt', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setSettingsOpen(
                    true,
                    tab.id as 'llm' | 'tts' | 'appearance' | 'persona'
                  )
                }
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                    : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: LLM */}
          {activeTab === 'llm' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2.5">
                  1. 选择大模型服务商 (一键填入预设 Base URL 与模型)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(LLM_PROVIDER_PRESETS) as LLMProviderId[]).map(
                    (pid) => {
                      const preset = LLM_PROVIDER_PRESETS[pid];
                      const selected = llmConfig.provider === pid;
                      return (
                        <button
                          key={pid}
                          onClick={() => handleSelectLLMProvider(pid)}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                            selected
                              ? 'border-pink-400 bg-pink-500/15 shadow-lg shadow-pink-500/10'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                              {preset.name}
                              {selected && (
                                <Check className="w-4 h-4 text-pink-400" />
                              )}
                            </div>
                            <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-pink-200">
                              {preset.badge}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-white/70">
                      API Key 密钥
                    </label>
                    {currentLLMPreset.docUrl && (
                      <a
                        href={currentLLMPreset.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-pink-400 hover:underline flex items-center gap-1"
                      >
                        获取 Key <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) => updateLLMConfig({ apiKey: e.target.value })}
                    placeholder={currentLLMPreset.placeholderKey}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-400"
                  />
                  <p className="mt-1 text-[11px] text-white/45">
                    密钥仅保存在您的本地浏览器或私有服务端，不经过任何第三方。不填也可体验内置模拟灵宠。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    接口地址 (Base URL)
                  </label>
                  <input
                    type="text"
                    value={llmConfig.baseUrl}
                    onChange={(e) => updateLLMConfig({ baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com/v1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    模型名称 (Model ID，可手填或快捷选择)
                  </label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => updateLLMConfig({ model: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-400"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentLLMPreset.models.map((m) => (
                      <button
                        key={m}
                        onClick={() => updateLLMConfig({ model: m })}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                          llmConfig.model === m
                            ? 'border-pink-400 bg-pink-500/20 text-pink-200'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    创造力温度 (Temperature: {llmConfig.temperature.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1.3}
                    step={0.05}
                    value={llmConfig.temperature}
                    onChange={(e) =>
                      updateLLMConfig({ temperature: parseFloat(e.target.value) })
                    }
                    className="w-full accent-pink-500 mt-2"
                  />
                  <div className="flex justify-between text-[11px] text-white/40 mt-1">
                    <span>严谨稳定 (0.1)</span>
                    <span>灵动活泼 (0.75)</span>
                    <span>天马行空 (1.3)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TTS */}
          {activeTab === 'tts' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.enabled}
                      onChange={(e) =>
                        updateTTSConfig({ enabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-pink-500 rounded"
                    />
                    <span>开启宠物语音朗读</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsConfig.autoPlay}
                      onChange={(e) =>
                        updateTTSConfig({ autoPlay: e.target.checked })
                      }
                      className="w-4 h-4 accent-pink-500 rounded"
                    />
                    <span>回复时自动开口说话</span>
                  </label>
                </div>

                <button
                  onClick={handleTestVoice}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  试听配音 & 口型同步
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2.5">
                  选择配音引擎 (支持免 Key 零成本发音 或 接入专业云端/本地配音 API)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(TTS_PROVIDER_PRESETS) as TTSProviderId[]).map(
                    (tid) => {
                      const preset = TTS_PROVIDER_PRESETS[tid];
                      const selected = ttsConfig.provider === tid;
                      return (
                        <button
                          key={tid}
                          onClick={() => handleSelectTTSProvider(tid)}
                          className={`p-3 rounded-2xl border text-left transition ${
                            selected
                              ? 'border-pink-400 bg-pink-500/15'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white flex items-center justify-between">
                            <span>{preset.name}</span>
                            {selected && (
                              <Check className="w-4 h-4 text-pink-400 shrink-0" />
                            )}
                          </div>
                          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-pink-200">
                            {preset.badge}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
                <p className="mt-2 text-xs text-white/55">
                  💡 {currentTTSPreset.description}
                </p>
              </div>

              {/* Voice Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    预设声线选择 (或下方自定义填入 Voice ID)
                  </label>
                  <select
                    value={ttsConfig.voice}
                    onChange={(e) => updateTTSConfig({ voice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c162b] border border-white/15 text-sm text-white focus:outline-none focus:border-pink-400"
                  >
                    {currentTTSPreset.voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    自定义音色 ID / Reference ID
                  </label>
                  <input
                    type="text"
                    value={ttsConfig.voice}
                    onChange={(e) => updateTTSConfig({ voice: e.target.value })}
                    placeholder="例如 nova / FunAudioLLM/CosyVoice2-0.5B:anna"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              {currentTTSPreset.requiresKey && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      配音 API Key
                    </label>
                    <input
                      type="password"
                      value={ttsConfig.apiKey}
                      onChange={(e) =>
                        updateTTSConfig({ apiKey: e.target.value })
                      }
                      placeholder="填入对应平台的 API Key"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      配音 Base URL
                    </label>
                    <input
                      type="text"
                      value={ttsConfig.baseUrl}
                      onChange={(e) =>
                        updateTTSConfig({ baseUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-400"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    语速调节 (Speed: {ttsConfig.speed.toFixed(2)}x)
                  </label>
                  <input
                    type="range"
                    min={0.7}
                    max={1.5}
                    step={0.05}
                    value={ttsConfig.speed}
                    onChange={(e) =>
                      updateTTSConfig({ speed: parseFloat(e.target.value) })
                    }
                    className="w-full accent-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    萌度语调 (Pitch: {ttsConfig.pitch.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min={0.8}
                    max={1.4}
                    step={0.04}
                    value={ttsConfig.pitch}
                    onChange={(e) =>
                      updateTTSConfig({ pitch: parseFloat(e.target.value) })
                    }
                    className="w-full accent-pink-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3D APPEARANCE & VRM IMPORT */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2.5">
                  1. 内置程序化 3D 萌宠种族切换 (支持果冻物理形变 + 实时口型)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'chubbywhale',
                      title: '深海大肥鱼 · ChubbyWhale (默认推荐)',
                      desc: '圆滚滚蓝白肚皮 + 头顶灵动呆毛 + 女仆领结 + 胖乎乎鲸鱼大尾鳍',
                    },
                    {
                      id: 'mochi',
                      title: '星光糯米团 · Mochi',
                      desc: '软萌垂耳团子，Q弹果冻物理手感',
                    },
                    {
                      id: 'cyberfox',
                      title: '霓虹灵狐 · CyberFox',
                      desc: '科技金属光泽尖耳 + 大尾巴摆动',
                    },
                    {
                      id: 'astracat',
                      title: '星际喵灵 · AstraCat',
                      desc: '灵动三角猫耳 + 双高光星瞳',
                    },
                  ].map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        setCustomModel(null, null);
                        setSpecies(sp.id as PetSpecies);
                      }}
                      className={`p-4 rounded-2xl border text-left transition ${
                        pet.species === sp.id
                          ? 'border-pink-400 bg-pink-500/15'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="font-semibold text-sm text-white">
                        {sp.title}
                      </div>
                      <div className="text-xs text-white/50 mt-1">{sp.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2.5">
                  2. 主题毛色与舞台星云氛围
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PET_THEME_PRESETS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeId(theme.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                        pet.themeId === theme.id
                          ? 'border-pink-400 bg-white/10'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full shrink-0 border border-white/30 shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
                        }}
                      />
                      <span className="text-xs font-medium text-white truncate">
                        {theme.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-dashed border-white/20 bg-white/[0.02]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      导入自定义 3D 模型 (.vrm / .glb / .gltf)
                    </h4>
                    <p className="text-xs text-white/50 mt-0.5">
                      支持 VRoid Studio 导出的 `.vrm` 虚拟形象（自动绑定 `aa` 口型同步与头部视线追踪）或任意 `.glb` 3D 模型。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".vrm,.glb,.gltf"
                      onChange={handleModelFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition"
                    >
                      <Upload className="w-4 h-4" />
                      选择本地模型文件
                    </button>
                    {pet.customModelUrl && (
                      <button
                        onClick={() => setCustomModel(null, null)}
                        className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs text-red-200 transition"
                      >
                        切回内置萌宠
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERSONA & SYSTEM PROMPT */}
          {activeTab === 'persona' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  宠物昵称
                </label>
                <input
                  type="text"
                  value={pet.name}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-white/70">
                    灵魂人设与动作驱动协议 (System Prompt)
                  </label>
                  <button
                    onClick={() =>
                      updateLLMConfig({ systemPrompt: DEFAULT_SYSTEM_PROMPT })
                    }
                    className="flex items-center gap-1 text-xs text-pink-400 hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    恢复默认灵宠协议
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={llmConfig.systemPrompt}
                  onChange={(e) =>
                    updateLLMConfig({ systemPrompt: e.target.value })
                  }
                  className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs leading-relaxed text-white font-mono focus:outline-none focus:border-pink-400"
                />
                <p className="text-[11px] text-white/45 mt-1.5">
                  提示：保留 `[EMOTION:情绪|ACTION:动作]` 协议指令，大模型就会在每次说话时自动触发 3D 宠物的表情变化与跳跃/转圈/跳舞动作！
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-black/30">
          <span className="text-xs text-white/45">
            所有配置已通过 Zustand 自动持久化保存在本地
          </span>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 hover:opacity-95 transition"
          >
            完成并生效
          </button>
        </div>
      </div>
    </div>
  );
}
