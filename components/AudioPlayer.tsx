
import React, { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  audioData: string | null;
  onEnded: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, onEnded }) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  function base64ToUint8Array(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Fallback for Gemini's raw 16-bit PCM (no header)
  async function decodeRawPCM(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const numChannels = 1;
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }

  useEffect(() => {
    if (!audioData) return;

    const playAudio = async () => {
      // Create context if not exists. No fixed sampleRate here to allow standard files to play naturally.
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      try {
        const bytes = base64ToUint8Array(audioData);
        let audioBuffer: AudioBuffer;

        try {
          // 优先尝试原生解码 (适合录音生成的 WebM/MP4 等带 Header 的文件)
          // decodeAudioData needs an ArrayBuffer
          audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        } catch (nativeError) {
          // 如果原生解码失败，退守到 PCM 模式 (适合 Gemini AI 返回的原始数据)
          // console.log("[Audio] Native decode failed, falling back to raw PCM mode...");
          audioBuffer = await decodeRawPCM(bytes, ctx, 24000);
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = onEnded;
        source.start(0);
      } catch (error) {
        console.error("Audio playback fatal error:", error);
        onEnded();
      }
    };

    playAudio();
  }, [audioData]);

  return null;
};

export default AudioPlayer;
