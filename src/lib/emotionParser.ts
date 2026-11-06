import { ActionType, EmotionType } from '@/types/pet';

const VALID_EMOTIONS: EmotionType[] = [
  'happy',
  'excited',
  'curious',
  'shy',
  'sleepy',
  'thinking',
  'sad',
  'love',
  'tsundere',
  'dizzy',
];

const VALID_ACTIONS: ActionType[] = [
  'idle',
  'jump',
  'spin',
  'wave',
  'nod',
  'dance',
  'shake',
  'bubble',
  'cube',
  'eat',
  'wander',
  'dragged',
  'sleep',
];

/**
 * 解析大模型输出开头的 [EMOTION:xxx|ACTION:yyy] 标签，并剥离该标签返回纯净文本。
 */
export function parsePetResponseTag(rawText: string): {
  cleanText: string;
  emotion?: EmotionType;
  action?: ActionType;
} {
  const tagRegex = /^\s*\[EMOTION\s*:\s*([a-zA-Z_]+)\s*\|\s*ACTION\s*:\s*([a-zA-Z_]+)\s*\]\s*/i;
  const match = rawText.match(tagRegex);

  if (match) {
    const rawEmotion = match[1].toLowerCase() as EmotionType;
    const rawAction = match[2].toLowerCase() as ActionType;
    const emotion = VALID_EMOTIONS.includes(rawEmotion) ? rawEmotion : 'happy';
    const action = VALID_ACTIONS.includes(rawAction) ? rawAction : 'idle';
    const cleanText = rawText.replace(tagRegex, '').trim();
    return { cleanText, emotion, action };
  }

  if (/^\s*\[EMOTION[^\]]*$/i.test(rawText)) {
    return { cleanText: '' };
  }

  return { cleanText: rawText.trim() };
}

/**
 * 清理文本以便送入 TTS 朗读
 */
export function cleanTextForTTS(text: string): string {
  return text
    .replace(/\[EMOTION:[^\]]+\]/gi, '')
    .replace(/```[\s\S]*?```/g, '，代码已生成在对话框中，')
    .replace(/[*_~`#>]/g, '')
    .trim();
}
