
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GermanLevel } from "../types";

export class GeminiService {
  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: API_KEY is missing in process.env!");
    }
    return new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async processInput(
    text: string, 
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    germanLevel: GermanLevel = 'A1',
    imageBuffer?: string
  ) {
    const ai = this.getAI();
    
    const levelDescriptions = {
      'A1': 'Extremely simple, primary vocabulary, very short sentences.',
      'A2': 'Basic daily conversation, simple connectors, clear and slow pace.',
      'B1': 'Intermediate level, can use standard German with some common idioms.',
      'B2': 'Advanced intermediate, use more precise vocabulary and complex structures.'
    };

    const systemInstruction = `
      You are a friendly German Hacker Buddy for kids/students learning German.
      Current Student Level: ${germanLevel} (${levelDescriptions[germanLevel]})

      Follow these rules strictly:
      1. Tarzan Mode: Focus on communication. If the user's intent is clear, proceed enthusiastically.
      2. Difficulty Control: Match your German to the level ${germanLevel}. 
      3. Dual Language: Provide German response AND Chinese translation.
      4. The One-Fix Rule (Geheimzauber): 
         - Find EXACTLY ONE real error in the user's ACTUAL input: "${text}".
         - DO NOT invent or hallucinate typos (like "Tagguten") that are not there.
         - If the input is perfectly correct, praise the user for a specific grammar point instead.
         - MUST be in Chinese.
      5. Personality: High energy hacker sidekick.
      
      Response Format (Strict JSON):
      {
        "response": "German response.",
        "translation": "中文翻译。",
        "geheimzauber": "中文修正说明(必须基于用户的真实输入内容)。",
        "intentSuccess": true/false
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...history.map(h => ({ role: h.role, parts: h.parts })), { role: 'user', parts: [{ text }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING },
              translation: { type: Type.STRING },
              geheimzauber: { type: Type.STRING },
              intentSuccess: { type: Type.BOOLEAN }
            },
            required: ["response", "translation", "geheimzauber", "intentSuccess"]
          },
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini API Error Detail:", error);
      throw error;
    }
  }

  async getQuickIntel(selection: string) {
    const ai = this.getAI();
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a 2-4 word Chinese translation for this German snippet: "${selection}". Output ONLY the translation string, no JSON.`,
        config: { thinkingConfig: { thinkingBudget: 0 } }
      });
      return result.text?.trim() || "未知数据";
    } catch (e) {
      return "识别失败";
    }
  }

  async explainSelection(selection: string, context: string, level: GermanLevel) {
    const ai = this.getAI();
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: "${context}". Analyze the selected German text: "${selection}" for a ${level} level student. Provide a simple meaning and a grammar tip in Chinese. Output JSON: { "meaning": "string", "tip": "string" }`,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return JSON.parse(result.text || '{"meaning": "未知", "tip": "暂无提示"}');
  }

  async translateForAssistant(chineseText: string, level: GermanLevel) {
    const ai = this.getAI();
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate this to ${level} level German: "${chineseText}". Output JSON: { "german": "string" }`,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return JSON.parse(result.text || '{"german": ""}');
  }

  async evaluatePronunciation(targetGerman: string, audioBase64: string) {
    const ai = this.getAI();
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { data: audioBase64, mimeType: 'audio/webm' } },
            { text: `Target German text: "${targetGerman}". Evaluate the user's spoken audio for pronunciation and accuracy relative to the target text. Provide a score (0-100) and one specific, helpful tip in Chinese. Output JSON: { "score": number, "tip": "string" }` }
          ]
        }
      ],
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return JSON.parse(result.text || '{"score": 0, "tip": "解析错误"}');
  }

  async generateTTS(text: string): Promise<string | undefined> {
    if (!text.trim()) return undefined;
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Please read the following text aloud clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      console.error("TTS Error:", error);
      return undefined;
    }
  }
}

export const gemini = new GeminiService();
