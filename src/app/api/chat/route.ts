import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/presets';

export const runtime = 'nodejs';

/**
 * 当用户尚未配置任何大模型 API Key 且环境变量也为空时的智能灵宠交互模式，
 * 确保开源项目 git clone 后零配置也能立即体验完整的 3D 情绪、动作与语音闭环。
 */
function buildSmartFallbackReply(userText: string, petName: string): string {
  const t = userText.toLowerCase();

  if (t.includes('跳') || t.includes('舞') || t.includes('dance')) {
    return `[EMOTION:excited|ACTION:dance] 好耶！音乐响起来，看我给你跳支元气满满的星光律动舞！需要在右上角「引擎配置」填入 DeepSeek 或 OpenAI Key 解锁我的完整智慧大脑哦~`;
  }
  if (t.includes('转圈') || t.includes('转个圈') || t.includes('spin')) {
    return `[EMOTION:happy|ACTION:spin] 呼啦啦~ 360度超级螺旋转身！是不是超丝滑呀？`;
  }
  if (t.includes('喜欢你') || t.includes('爱你') || t.includes('可爱') || t.includes('摸摸')) {
    return `[EMOTION:love|ACTION:jump] 呜哇~ 被主人夸奖好开心呀，我最喜欢陪伴在主人身边啦！`;
  }
  if (t.includes('难过') || t.includes('累') || t.includes('烦') || t.includes('不开心')) {
    return `[EMOTION:sad|ACTION:nod] 抱抱主人，辛苦啦！不管今天遇到什么烦恼，我都会一直在这里陪着你、给你加油充电的！`;
  }
  if (t.includes('你是谁') || t.includes('名字') || t.includes('介绍')) {
    return `[EMOTION:happy|ACTION:wave] 我是你的 3D AI 灵宠 ${petName}！我支持对接 DeepSeek、OpenAI、硅基流动、通义千问和本地 Ollama，还能实时口型同步说话哦！`;
  }
  if (t.includes('困') || t.includes('睡') || t.includes('晚安')) {
    return `[EMOTION:sleepy|ACTION:nod] 呼噜噜... 我也有点犯困啦，祝主人今晚做个甜甜的星河美梦哟~`;
  }

  return `[EMOTION:curious|ACTION:wave] 收到主人的话啦：「${userText.slice(0, 28)}」！我现在处于免 Key 离线灵宠体验模式，点击右上角「引擎配置」填入你的 DeepSeek 或 OpenAI API Key，就能开启无限自由对话啦！`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      llmConfig = {},
      petName = 'Aether',
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
    const temperature = typeof llmConfig.temperature === 'number' ? llmConfig.temperature : 0.75;
    const systemPrompt = llmConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const isOllama = llmConfig.provider === 'ollama' || baseUrl.includes('localhost:11434') || baseUrl.includes('127.0.0.1:11434');

    // 若既非本地 Ollama 又未配置任何 API Key，则使用内置高表现力流式模拟回复，保证开箱即用
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
