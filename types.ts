
export type GermanLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  image?: string; // Full Data URL (e.g. data:image/jpeg;base64,...)
  imageMimeType?: string; // mimeType for API call
  translation?: string; // Chinese translation for AI messages
  geheimzauber?: string; // The "Secret Spell" grammar correction
  audioData?: string; // Base64 PCM data
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: number | null;
  icon: string;
}

export interface SessionData {
  messages: Message[];
  xp: number;
  level: number;
  germanLevel: GermanLevel;
  unlockedAchievements: string[];
}
