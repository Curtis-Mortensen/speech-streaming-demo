export interface SettingsSpecV1 {
  version: 1;
  systemPrompt: string;
  model: 'minimax/speech-02-turbo' | 'minimax/speech-02-hd';
  voiceId: string;
  speed: number;
  volume: number;
  pitch: number;
  emotion?: 'auto' | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
  englishNormalization: boolean;
  sampleRate: 16000 | 22050 | 32000 | 44100 | 48000;
  bitrate: 64000 | 96000 | 128000 | 192000 | 256000;
  channel: 'mono' | 'stereo';
  languageBoost?: string;
}















































export const DEFAULT_SETTINGS_V1: SettingsSpecV1 = {
  version: 1,
  systemPrompt: '',
  model: 'minimax/speech-02-turbo',
  voiceId: 'English_Trustworth_Man',
  speed: 1.0,
  volume: 1.0,
  pitch: 0,
  emotion: 'auto',
  englishNormalization: false,
  sampleRate: 32000,
  bitrate: 128000,
  channel: 'mono',
  languageBoost: 'English',
};
















export function clampSettingsToSpec(s: Partial<SettingsSpecV1>): SettingsSpecV1 {
  const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
  const isString = (v: unknown): v is string => typeof v === 'string';

  const validModels = new Set(['minimax/speech-02-turbo', 'minimax/speech-02-hd']);
  const validEmotions = new Set(['auto', 'neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']);
  const validSampleRates = new Set([16000, 22050, 32000, 44100, 48000]);
  const validBitrates = new Set([64000, 96000, 128000, 192000, 256000]);
  const validChannels = new Set(['mono', 'stereo']);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const merged = { ...DEFAULT_SETTINGS_V1, ...(s || {}) } as SettingsSpecV1;

  // version
  const version: 1 = 1;

  // systemPrompt
  const systemPrompt = isString(merged.systemPrompt) ? merged.systemPrompt : DEFAULT_SETTINGS_V1.systemPrompt;

  // model
  const model = isString((merged as any).model) && validModels.has((merged as any).model)
    ? ((merged as any).model as SettingsSpecV1['model'])
    : DEFAULT_SETTINGS_V1.model;

  // voiceId
  const voiceId = isString((merged as any).voiceId) && (merged as any).voiceId.trim().length > 0
    ? (merged as any).voiceId.trim()
    : DEFAULT_SETTINGS_V1.voiceId;

  // speed
  const speed = isNumber((merged as any).speed)
    ? clamp((merged as any).speed, 0.5, 2.0)
    : DEFAULT_SETTINGS_V1.speed;

  // volume
  const volume = isNumber((merged as any).volume)
    ? clamp((merged as any).volume, 0.0, 2.0)
    : DEFAULT_SETTINGS_V1.volume;

  // pitch (integer -12..12)
  let pitchRaw = (merged as any).pitch;
  if (!isNumber(pitchRaw)) pitchRaw = DEFAULT_SETTINGS_V1.pitch;
  const pitch = clamp(Math.round(pitchRaw), -12, 12);

  // emotion (optional, default 'auto')
  const emotionValue = (merged as any).emotion;
  const emotion = isString(emotionValue) && validEmotions.has(emotionValue)
    ? (emotionValue as NonNullable<SettingsSpecV1['emotion']>)
    : DEFAULT_SETTINGS_V1.emotion;

  // englishNormalization
  const englishNormalization = typeof (merged as any).englishNormalization === 'boolean'
    ? (merged as any).englishNormalization
    : DEFAULT_SETTINGS_V1.englishNormalization;

  // sampleRate
  const sampleRateCandidate = (merged as any).sampleRate;
  const sampleRate = isNumber(sampleRateCandidate) && validSampleRates.has(sampleRateCandidate)
    ? (sampleRateCandidate as SettingsSpecV1['sampleRate'])
    : DEFAULT_SETTINGS_V1.sampleRate;

  // bitrate
  const bitrateCandidate = (merged as any).bitrate;
  const bitrate = isNumber(bitrateCandidate) && validBitrates.has(bitrateCandidate)
    ? (bitrateCandidate as SettingsSpecV1['bitrate'])
    : DEFAULT_SETTINGS_V1.bitrate;

  // channel
  const channelCandidate = (merged as any).channel;
  const channel = isString(channelCandidate) && validChannels.has(channelCandidate)
    ? (channelCandidate as SettingsSpecV1['channel'])
    : DEFAULT_SETTINGS_V1.channel;

  // languageBoost (optional string, default 'English')
  const languageBoostCandidate = (merged as any).languageBoost;
  const languageBoost = isString(languageBoostCandidate) && languageBoostCandidate.trim().length > 0
    ? languageBoostCandidate.trim()
    : DEFAULT_SETTINGS_V1.languageBoost;

  return {
    version,
    systemPrompt,
    model,
    voiceId,
    speed,
    volume,
    pitch,
    emotion,
    englishNormalization,
    sampleRate,
    bitrate,
    channel,
    languageBoost,
  };
}