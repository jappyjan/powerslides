export const WS_ROOM_PREFIX = 'slides';
export const WS_EVENT_STATE = 'state';
export const WS_EVENT_COMMAND = 'command';

export type PresentationData = {
  current: number | null;
  total: number | null;
  speakerNote: string | null;
  title: string | null;
  updatedAt: number | null;
  presentationStartedAt: number | null;
};

export type SlideCommandType = 'next' | 'previous' | 'open_present' | 'start_presentation';

export type SlideCommand = {
  type: SlideCommandType;
  at: number;
  from?: string;
  id?: string;
};

export type WsJoinMessage = {
  type: 'join';
  slideId: string;
  password: string;
  createRoom?: boolean;
};

export type WsStateMessage = {
  type: 'state';
  payload: PresentationData;
};

export type WsCommandMessage = {
  type: 'command';
  payload: SlideCommand;
};

export type WsMessage = WsJoinMessage | WsStateMessage | WsCommandMessage;

export type PairingPayload = {
  slideId: string;
  password: string;
};

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PAIRING_CODE_LENGTH = 12;
const PAIRING_CODE_TTL_MINUTES = 5;
const PAIRING_CODE_RANDOM_BITS = 28;

export type PairingSession = {
  code: string;
  payload: PairingPayload;
};

export type PairingCodeError = 'invalid' | 'expired';

export const normalizePairingCode = (value: string): string =>
  value.toUpperCase().replace(/[-\s]/g, '');

export const formatPairingCode = (value: string): string => {
  const normalized = normalizePairingCode(value).replace(/[^A-Z2-7]/g, '');
  if (!normalized) {
    return '';
  }
  const groups = [];
  for (let i = 0; i < normalized.length; i += 4) {
    groups.push(normalized.slice(i, i + 4));
  }
  return groups.join('-');
};

const encodeBase32 = (value: bigint, length: number): string => {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const shift = BigInt((length - 1 - i) * 5);
    const index = Number((value >> shift) & 31n);
    result += BASE32_ALPHABET[index];
  }
  return result;
};

const decodeBase32 = (value: string): bigint | null => {
  let result = 0n;
  for (const char of value) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      return null;
    }
    result = (result << 5n) | BigInt(index);
  }
  return result;
};

const getRandomBits = (bitCount: number): number => {
  if (bitCount <= 0) {
    return 0;
  }
  const maxValue = 2 ** bitCount;
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % maxValue;
  }
  return Math.floor(Math.random() * maxValue);
};

const buildPayloadFromCode = (normalizedCode: string): PairingPayload => ({
  slideId: normalizedCode,
  password: normalizedCode,
});

export const createPairingSession = (): PairingSession => {
  const minutesSinceEpoch = Math.floor(Date.now() / 60000);
  const randomBits = getRandomBits(PAIRING_CODE_RANDOM_BITS);
  const codeValue =
    (BigInt(minutesSinceEpoch) << BigInt(PAIRING_CODE_RANDOM_BITS)) |
    BigInt(randomBits);
  const normalizedCode = encodeBase32(codeValue, PAIRING_CODE_LENGTH);

  return {
    code: formatPairingCode(normalizedCode),
    payload: buildPayloadFromCode(normalizedCode),
  };
};

export const parsePairingCodeResult = (
  value: string
): { payload: PairingPayload | null; error?: PairingCodeError } => {
  const normalized = normalizePairingCode(value);
  if (normalized.length !== PAIRING_CODE_LENGTH) {
    return { payload: null, error: 'invalid' };
  }
  if (![...normalized].every((char) => BASE32_ALPHABET.includes(char))) {
    return { payload: null, error: 'invalid' };
  }
  const decoded = decodeBase32(normalized);
  if (!decoded) {
    return { payload: null, error: 'invalid' };
  }
  const minutesSinceEpoch = Number(decoded >> BigInt(PAIRING_CODE_RANDOM_BITS));
  if (!Number.isFinite(minutesSinceEpoch)) {
    return { payload: null, error: 'invalid' };
  }
  const nowMinutes = Math.floor(Date.now() / 60000);
  const ageMinutes = nowMinutes - minutesSinceEpoch;
  if (ageMinutes < 0 || ageMinutes > PAIRING_CODE_TTL_MINUTES) {
    return { payload: null, error: 'expired' };
  }
  return { payload: buildPayloadFromCode(normalized) };
};

export const parsePairingCode = (value: string): PairingPayload | null =>
  parsePairingCodeResult(value).payload;

export const generatePairingPassword = (length = 32): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint8Array(length))
      : null;

  let result = '';
  for (let i = 0; i < length; i += 1) {
    const index = bytes ? bytes[i] % charset.length : Math.floor(Math.random() * charset.length);
    result += charset[index];
  }
  return result;
};

export const createCommandId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cmd_${generatePairingPassword(12)}`;
};
