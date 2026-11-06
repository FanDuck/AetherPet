import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/presets';

export const runtime = 'nodejs';

/**
 * 当用户尚未配置任何大模型 API Key 且环境变量也为空时的「大肥鱼」傲娇嘴硬智能模式，
 * 确保开源项目 git clone 后零配置也能立即体验完整的 3D 肥鱼情绪、吐泡泡、玩魔方、喂小鱼干与语音闭环。
 */
function buildSmartFallbackReply(userText: string, petName: string): string {
  const t = userText.toLowerCase();

  if (t.includes('泡泡') || t.includes('bubble')) {
    return `[EMOTION:tsundere|ACTION:bubble] 哼，看你这么无聊的份上，本肥鱼就勉为其难给你吐一串深海七彩大泡泡吧！咕噜噜噜~`;
  }
  if (t.includes('魔方') || t.includes('cube') || t.includes('聪明')) {
    return `[EMOTION:excited|ACTION:cube] 瞧好了！三阶全息魔方本肥鱼闭着眼睛三秒就能还原，是不是超厉害？快拿小鱼干奖励我！`;
  }
  if (t.includes('鱼干') || t.includes('吃') || t.includes('饿') || t.includes('喂')) {
    return `[EMOTION:happy|ACTION:eat] 嗷呜嗷呜！金黄酥脆的深海小鱼干太香啦，本肥鱼才不是贪吃呢，只是为了补充算力陪你写代码！`;
  }
  if (t.includes('跳') || t.includes('舞') || t.includes('dance')) {
    return `[EMOTION:excited|ACTION:dance] 音乐起！看我摇着圆滚滚的鲸鱼大尾巴给你来一段深海摇摆舞，不许笑我胖哦！`;
  }
  if (t.includes('转圈') || t.includes('转个圈') || t.includes('spin')) {
    return `[EMOTION:happy|ACTION:spin] 呼啦啦~ 360度深海肥鱼大回旋！头顶的呆毛都要转晕啦~`;
  }
  if (t.includes('喜欢你') || t.includes('爱你') || t.includes('可爱') || t.includes('摸摸')) {
    return `[EMOTION:tsundere|ACTION:jump] 哼、哼！突然夸本肥鱼干嘛啦，就算你摸摸我的呆毛，我也只会多陪你亿会儿而已哦！`;
  }
  if (t.includes('难过') || t.includes('累') || t.includes('烦') || t.includes('不开心') || t.includes('bug')) {
    return `[EMOTION:love|ACTION:nod] 笨蛋主人辛苦啦，快歇一会儿！不管是讨厌的 Bug 还是烦恼，本大肥鱼都会甩着尾巴帮你统统拍飞的！`;
  }
  if (t.includes('困') || t.includes('睡') || t.includes('晚安')) {
    return `[EMOTION:sleepy|ACTION:sleep] 呼噜噜... 本肥鱼也困得睁不开眼啦，吐个安眠泡泡陪你一起睡个好觉吧~`;
  }

  return `[EMOTION:tsundere|ACTION:bubble] 哼哼，本肥鱼听到你说「${userText.slice(0, 26)}」啦！你可以直接用鼠标左键拎起我在屏幕上晃晃、右键呼出秘密菜单喂小鱼干，或者在右上角「引擎配置」填入 DeepSeek Key 解锁我的完全体毒舌傲娇大脑哦！`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      llmConfig = {},
      petName = '大肥鱼',
    } = body;

    const apiKey = (llmConfig.apiKey || process.env.LLM_API_KEY || '').trim();
    const baseUrl = (
      llmConfig.baseUrl ||
      process.env.LLM_BASE_URL ||
      'https://api.deepseek.com/v1'
    )
      .trim()
      .replace(/\/+$/, '');
    const model = (llmConfig.model || process.env.LLM_MODEL || 'deepseek-chat').trim();
    const temperature = typeof llmConfig.temperature === 'number' ? llmConfig.temperature : 0.78;
    const systemPrompt = llmConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const isOllama =
      llmConfig.provider === 'ollama' ||
      baseUrl.includes('localhost:11434') ||
      baseUrl.includes('127.0.0.1:11434');

    if (!apiKey && !isOllama) {
      const lastUserMsg =
        [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ||
        '你好呀';
      const fallbackText = buildSmartFallbackReply(lastUserMsg, petName);

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const chunks = fallbackText.match(/.{1,4}/g) || [fallbackText];
          for (const chunk of chunks) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            );
            await new Promise((r) => setTimeout(r, 25));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-14).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
        stream: true,
      }),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      return NextResponse.json(
        {
          error: `大模型接口返回异常 (${upstreamRes.status}): ${errText.slice(0, 240)}`,
        },
        { status: upstreamRes.status }
      );
    }

    if (!upstreamRes.body) {
      return NextResponse.json({ error: '上游大模型未返回流数据' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamRes.body!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line || !line.startsWith('data:')) continue;
              const dataStr = line.replace(/^data:\s*/, '').trim();
              if (dataStr === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                  );
                }
              } catch {
                // ignore partial json
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: `\n[流式传输出错: ${(err as Error).message}]` })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `服务端请求失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
