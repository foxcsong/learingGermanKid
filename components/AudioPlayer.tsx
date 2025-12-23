
import React, { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  audioData: string | null;
  onEnded: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, onEnded }) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  useEffect(() => {
    if (!audioData) return;

    const playAudio = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      try {
        const bytes = decode(audioData);
        const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = onEnded;
        source.start(0);
      } catch (error) {
        console.error("Audio playback error:", error);
        onEnded();
      }
    };

    playAudio();
  }, [audioData]);

  return null;
};

export default AudioPlayer;
