import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AetherPet · 开源 3D AI 宠物伴侣框架 (Multi-LLM + Multi-TTS + Three.js)',
  description:
    '前后端一体的开源 3D AI 宠物框架，支持对接 DeepSeek、OpenAI、硅基流动、通义千问、Ollama 等大模型，内置多源 TTS 配音与 WebAudio 实时 3D 口型同步。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
