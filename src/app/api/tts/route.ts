import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * 统一多源配音 API 网关 (`/api/tts`)
 * 支持：
 * 1. OpenAI 标准 `/v1/audio/speech` (OpenAI / OneAPI)
 * 2. SiliconFlow 硅基流动 (FunAudioLLM/CosyVoice2-0.5B 等)
 * 3. Fish Audio (`/v1/tts`)
 * 4. ElevenLabs (`/v1/text-to-speech/{voice_id}`)
 * 5. 本地自定义 TTS (GPT-SoVITS / CosyVoice OpenAI 兼容端点)
 * 6. 免 Key 免费云端语音合成 (自动回退，确保零配置也能返回真实 MP3 音频流驱动 3D 口型)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text = '',
      ttsConfig = {},
    } = body;

    const cleanText = String(text).trim().slice(0, 500);
    if (!cleanText) {
      return NextResponse.json({ error: '配音文本不能为空' }, { status: 400 });
    }

    const provider = ttsConfig.provider || 'edge';
    const apiKey = (
      ttsConfig.apiKey ||
      process.env.TTS_API_KEY ||
      process.env.ELEVENLABS_API_KEY ||
      process.env.FISH_AUDIO_API_KEY ||
      ''
    ).trim();
    const speed = typeof ttsConfig.speed === 'number' ? ttsConfig.speed : 1.0;

    // 1. ElevenLabs 专属协议
    if (provider === 'elevenlabs') {
      if (!apiKey) {
        return NextResponse.json(
          { error: 'ElevenLabs 需要填写 API Key，或切换为免 Key 配音引擎' },
          { status: 400 }
        );
      }
      const voiceId = ttsConfig.voice || 'EXAVITQu4vr4xnSDxMaL';
      const baseUrl = (ttsConfig.baseUrl || 'https://api.elevenlabs.io/v1').replace(/\/+$/, '');
      const modelId = ttsConfig.model || 'eleven_multilingual_v2';

      const res = await fetch(`${baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `ElevenLabs TTS 失败 (${res.status}): ${errText.slice(0, 180)}` },
          { status: res.status }
        );
      }

      const audioBuffer = await res.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 2. Fish Audio 专属协议
    if (provider === 'fishaudio') {
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Fish Audio 需要填写 API Key，或切换为免 Key 配音引擎' },
          { status: 400 }
        );
      }
      const baseUrl = (ttsConfig.baseUrl || 'https://api.fish.audio/v1').replace(/\/+$/, '');
      const referenceId = ttsConfig.voice || '7f92f8afb8ec43bf81429cc1c9199cb1';

      const res = await fetch(`${baseUrl}/tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          reference_id: referenceId,
          format: 'mp3',
          mp3_bitrate: 128,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Fish Audio TTS 失败 (${res.status}): ${errText.slice(0, 180)}` },
          { status: res.status }
        );
      }

      const audioBuffer = await res.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 3. OpenAI / SiliconFlow / 自定义本地 TTS (统一 `/v1/audio/speech` 规范)
    if (provider === 'openai' || provider === 'siliconflow' || provider === 'custom_tts') {
      if (provider !== 'custom_tts' && !apiKey) {
        return NextResponse.json(
          { error: `${provider} 配音需要填写 API Key，或切换为免 Key 引擎` },
          { status: 400 }
        );
      }

      const defaultBase =
        provider === 'siliconflow'
          ? 'https://api.siliconflow.cn/v1'
          : provider === 'custom_tts'
          ? 'http://localhost:9880/v1'
          : 'https://api.openai.com/v1';

      const baseUrl = (ttsConfig.baseUrl || defaultBase).replace(/\/+$/, '');
      const endpoint = baseUrl.endsWith('/audio/speech')
        ? baseUrl
        : `${baseUrl}/audio/speech`;

      const model =
        ttsConfig.model ||
        (provider === 'siliconflow' ? 'FunAudioLLM/CosyVoice2-0.5B' : 'tts-1');
      const voice =
        ttsConfig.voice ||
        (provider === 'siliconflow' ? 'FunAudioLLM/CosyVoice2-0.5B:anna' : 'nova');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          input: cleanText,
          voice,
          speed,
          response_format: 'mp3',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `TTS 接口返回异常 (${res.status}): ${errText.slice(0, 200)}` },
          { status: res.status }
        );
      }

      const audioBuffer = await res.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': res.headers.get('content-type') || 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 4. 免 Key 云端语音兜底 (provider === 'edge')
    // 先尝试免鉴权 Edge / Google TTS 音频流接口，若当前网络环境受限则返回标记由前端无缝切换 Web Speech + 拟真声波包络
    const voice = ttsConfig.voice || 'zh-CN-XiaoyiNeural';
    const lang = voice.startsWith('ja')
      ? 'ja'
      : voice.startsWith('en')
      ? 'en'
      : voice.startsWith('zh-HK')
      ? 'zh-TW'
      : 'zh-CN';

    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      cleanText.slice(0, 180)
    )}&tl=${lang}&client=tw-ob`;

    const freeRes = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (freeRes.ok) {
      const buf = await freeRes.arrayBuffer();
      if (buf.byteLength > 256) {
        return new Response(buf, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    return NextResponse.json(
      { fallbackToBrowser: true, reason: 'Use native Web Speech engine with lip-sync envelope' },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { fallbackToBrowser: true, reason: (err as Error).message },
      { status: 200 }
    );
  }
}
