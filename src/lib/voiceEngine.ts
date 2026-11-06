'use client';

import { TTSConfig } from '@/types/pet';
import { cleanTextForTTS } from '@/lib/emotionParser';

class VoiceEngine {
  private audioCtx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private rafId: number | null = null;
  private simInterval: ReturnType<typeof setInterval> | null = null;

  public stopAll(
    onMouthChange?: (val: number) => void,
    onSpeakingChange?: (speaking: boolean) => void
  ) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onMouthChange?.(0);
    onSpeakingChange?.(false);
  }

  public async speak(
    rawText: string,
    ttsConfig: TTSConfig,
    callbacks: {
      onMouthChange: (val: number) => void;
      onSpeakingChange: (speaking: boolean) => void;
      onError?: (err: string) => void;
    }
  ) {
    this.stopAll(callbacks.onMouthChange, callbacks.onSpeakingChange);

    if (!ttsConfig.enabled) return;

    const text = cleanTextForTTS(rawText);
    if (!text) return;

    // 如果用户明确选择浏览器原生 Web Speech API
    if (ttsConfig.provider === 'browser') {
      this.speakWithBrowserSpeech(text, ttsConfig, callbacks);
      return;
    }

    try {
      callbacks.onSpeakingChange(true);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ttsConfig }),
      });

      const contentType = res.headers.get('content-type') || '';

      // 如果服务端返回 JSON（表示需要回退到浏览器原生语音或报错）
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.fallbackToBrowser) {
          this.speakWithBrowserSpeech(text, ttsConfig, callbacks);
          return;
        }
        if (data.error) {
          callbacks.onError?.(data.error);
          // 即使云端 Key 未填，也自动用浏览器语音兜底，不让宠物变成哑巴
          this.speakWithBrowserSpeech(text, ttsConfig, callbacks);
          return;
        }
      }

      if (!res.ok) {
        this.speakWithBrowserSpeech(text, ttsConfig, callbacks);
        return;
      }

      const blob = await res.blob();
      if (blob.size < 100) {
        this.speakWithBrowserSpeech(text, ttsConfig, callbacks);
        return;
      }

      await this.playAudioBlobWithAnalyser(blob, ttsConfig, callbacks);
    } catch {
      this.speakWithBrowserSpeech(text, ttsConfig, callbacks);
    }
  }

  private async playAudioBlobWithAnalyser(
    blob: Blob,
    ttsConfig: TTSConfig,
    callbacks: {
      onMouthChange: (val: number) => void;
      onSpeakingChange: (speaking: boolean) => void;
    }
  ) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = Math.min(2.0, Math.max(0.5, ttsConfig.speed || 1.0));
    this.currentAudio = audio;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const source = this.audioCtx.createMediaElementSource(audio);
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.65;

    source.connect(analyser);
    analyser.connect(this.audioCtx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateMouth = () => {
      if (!this.currentAudio || this.currentAudio.paused || this.currentAudio.ended) {
        callbacks.onMouthChange(0);
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      // 取人声核心频段 (约 100Hz ~ 3000Hz 对应的前 36 个 bin)
      let sum = 0;
      const bins = Math.min(36, dataArray.length);
      for (let i = 2; i < bins; i++) {
        sum += dataArray[i];
      }
      const avg = sum / (bins - 2);
      const normalized = Math.min(1, Math.max(0, (avg - 12) / 115));
      callbacks.onMouthChange(normalized);
      this.rafId = requestAnimationFrame(updateMouth);
    };

    audio.onplay = () => {
      callbacks.onSpeakingChange(true);
      this.rafId = requestAnimationFrame(updateMouth);
    };

    const cleanup = () => {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      callbacks.onMouthChange(0);
      callbacks.onSpeakingChange(false);
      URL.revokeObjectURL(url);
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    await audio.play();
  }

  private speakWithBrowserSpeech(
    text: string,
    ttsConfig: TTSConfig,
    callbacks: {
      onMouthChange: (val: number) => void;
      onSpeakingChange: (speaking: boolean) => void;
    }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.simulateVowelLipSync(text.length * 140, callbacks);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();
    const targetLang = ttsConfig.voice?.startsWith('ja')
      ? 'ja'
      : ttsConfig.voice?.startsWith('en')
      ? 'en'
      : 'zh';

    // 优先挑选名字里带 Xiaoyi / Xiaoxiao / Huihui / Yaoyao / Natural / Female 的甜美音色
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().includes(targetLang) &&
          /xiaoyi|xiaoxiao|yunxia|natural|neural|huihui|yaoyao|female|google/i.test(v.name)
      ) || voices.find((v) => v.lang.toLowerCase().includes(targetLang));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = 'zh-CN';
    }

    utterance.rate = Math.min(1.8, Math.max(0.6, ttsConfig.speed || 1.05));
    utterance.pitch = Math.min(1.6, Math.max(0.6, ttsConfig.pitch || 1.12));

    const startLipEnvelope = () => {
      callbacks.onSpeakingChange(true);
      if (this.simInterval) clearInterval(this.simInterval);
      let tick = 0;
      this.simInterval = setInterval(() => {
        tick += 0.38;
        const wave =
          Math.abs(Math.sin(tick * 1.7)) * 0.65 +
          Math.abs(Math.cos(tick * 2.9)) * 0.35;
        callbacks.onMouthChange(Math.min(1, Math.max(0.08, wave)));
      }, 45);
    };

    const stopLipEnvelope = () => {
      if (this.simInterval) {
        clearInterval(this.simInterval);
        this.simInterval = null;
      }
      callbacks.onMouthChange(0);
      callbacks.onSpeakingChange(false);
    };

    utterance.onstart = startLipEnvelope;
    utterance.onend = stopLipEnvelope;
    utterance.onerror = stopLipEnvelope;

    window.speechSynthesis.speak(utterance);
  }

  private simulateVowelLipSync(
    durationMs: number,
    callbacks: {
      onMouthChange: (val: number) => void;
      onSpeakingChange: (speaking: boolean) => void;
    }
  ) {
    callbacks.onSpeakingChange(true);
    let elapsed = 0;
    this.simInterval = setInterval(() => {
      elapsed += 50;
      if (elapsed >= durationMs) {
        if (this.simInterval) clearInterval(this.simInterval);
        callbacks.onMouthChange(0);
        callbacks.onSpeakingChange(false);
        return;
      }
      const val = 0.25 + 0.65 * Math.abs(Math.sin(elapsed * 0.025));
      callbacks.onMouthChange(val);
    }, 50);
  }
}

export const voiceEngine = new VoiceEngine();
