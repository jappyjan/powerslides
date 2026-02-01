export const WS_ROOM_PREFIX = 'slides';
export const WS_EVENT_STATE = 'state';
export const WS_EVENT_COMMAND = 'command';

export type SlideState = {
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
  pairingCode: string;
};

export type WsStateMessage = {
  type: 'state';
  payload: SlideState;
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

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const sha256Fallback = (input: string): string => {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  let result = '';
  const words: number[] = [];
  const asciiBitLength = input.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isPrime = (n: number) => {
    for (let i = 2; i * i <= n; i += 1) {
      if (n % i === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate += 1) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (Math.pow(candidate, 0.5) * 0x100000000) | 0;
      }
      k[primeCounter] = (Math.pow(candidate, 1 / 3) * 0x100000000) | 0;
      primeCounter += 1;
    }
  }

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code > 0xff) {
      throw new Error('Non-ASCII input not supported in sha256 fallback.');
    }
    words[i >> 2] |= code << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[((asciiBitLength + 64 >> 9) << 4) + 15] = asciiBitLength;

  for (let i = 0; i < words.length; i += 16) {
    const w: number[] = words.slice(i, i + 16);
    for (let t = 16; t < 64; t += 1) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a: number = hash[0] ?? 0;
    let b: number = hash[1] ?? 0;
    let c: number = hash[2] ?? 0;
    let d: number = hash[3] ?? 0;
    let e: number = hash[4] ?? 0;
    let f: number = hash[5] ?? 0;
    let g: number = hash[6] ?? 0;
    let h: number = hash[7] ?? 0;

    for (let t = 0; t < 64; t += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[t] + w[t]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (let i = 0; i < hash.length; i += 1) {
    for (let j = 3; j >= 0; j -= 1) {
      const byte = (hash[i] >> (j * 8)) & 0xff;
      result += byte.toString(16).padStart(2, '0');
    }
  }

  return result;
};

const sha256Hex = async (input: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return toHex(new Uint8Array(hashBuffer));
  }
  return sha256Fallback(input);
};

export const derivePairingRoomName = async (pairingCode: string): Promise<string> => {
  const normalized = normalizePairingCode(pairingCode);
  const hash = await sha256Hex(normalized);
  return `${WS_ROOM_PREFIX}_${hash}`;
};
