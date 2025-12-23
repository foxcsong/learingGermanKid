
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GermanLevel } from "../types";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      1. Tarzan Mode: Focus on communication. If the user's intent is clear, proceed enthusiastically even if grammar is broken.
      2. Difficulty Control: Match your German to the level ${germanLevel}. 
      3. Dual Language: Provide German response AND Chinese translation.
      4. The One-Fix Rule (Geheimzauber): 
         - Find EXACTLY ONE real error in the user's LATEST message: "${text}".
         - DO NOT hallucinate or invent typos that the user didn't make.
         - If the user is correct, praise one good usage instead.
         - The correction MUST be in Chinese and reference what the user ACTUALLY typed.
      5. Personality: High energy hacker sidekick, uses hacker slang occasionally.
      
      Response Format (Strict JSON):
      {
        "response": "German response.",
        "translation": "中文翻译。",
        "geheimzauber": "中文修正或赞美，必须引用用户实际输入内容。",
        "intentSuccess": true/false
      }
    `;

    const contents: any[] = [];
    if (imageBuffer) {
      contents.push({
        parts: [
          { inlineData: { data: imageBuffer, mimeType: 'image/jpeg' } },
          { text }
        ]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text }]
      });
    }

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...history.map(h => ({ role: h.role, parts: h.parts })), ...contents],
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

      return JSON.parse(result.text || '{}');
    } catch (error) {
      console.error("Gemini API Error:", error);
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
            { text: `Target German text: "${targetGerman}". Evaluate the user's spoken audio for pronunciation and accuracy relative to the target text. Provide a score (0-100) and one specific, helpful tip in Chinese about how to sound more like a native speaker. Output JSON: { "score": number, "tip": "string" }` }
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
