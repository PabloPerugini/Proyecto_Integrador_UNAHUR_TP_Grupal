export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED_COLORS: Record<string, Rgba> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

const tokenCache = new Map<string, string>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

function clampAlpha(value: number): number {
  return clamp(value, 0, 1);
}

function parseHex(value: string): Rgba | null {
  const hex = value.slice(1);
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length === 3 || hex.length === 4) {
    const channels = hex.split('').map((char) => parseInt(char + char, 16));
    return {
      r: channels[0],
      g: channels[1],
      b: channels[2],
      a: channels.length === 4 ? channels[3] / 255 : 1,
    };
  }
  if (hex.length === 6 || hex.length === 8) {
    const channels = hex.match(/.{2}/g)?.map((pair) => parseInt(pair, 16)) ?? [];
    return {
      r: channels[0],
      g: channels[1],
      b: channels[2],
      a: channels.length === 4 ? channels[3] / 255 : 1,
    };
  }
  return null;
}

function parseChannel(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const parsed = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(parsed) ? (parsed / 100) * 255 : null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAlpha(value: string | undefined): number {
  if (!value) return 1;
  const trimmed = value.trim();
  const parsed = trimmed.endsWith('%')
    ? Number.parseFloat(trimmed.slice(0, -1)) / 100
    : Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? clampAlpha(parsed) : 1;
}

function parseRgb(body: string): Rgba | null {
  const [channelPart, alphaPart] = body.split('/');
  const channels = channelPart.trim().split(/[\s,]+/).filter(Boolean);
  if (channels.length < 3) return null;
  const parsed = channels.slice(0, 3).map(parseChannel);
  if (parsed.some((channel) => channel === null)) return null;
  const alpha = parseAlpha(alphaPart ?? channels[3]);
  return {
    r: clampByte(parsed[0] as number),
    g: clampByte(parsed[1] as number),
    b: clampByte(parsed[2] as number),
    a: alpha,
  };
}

function parseHue(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith('grad')) return Number.parseFloat(trimmed) * 0.9;
  if (trimmed.endsWith('rad')) return (Number.parseFloat(trimmed) * 180) / Math.PI;
  if (trimmed.endsWith('turn')) return Number.parseFloat(trimmed) * 360;
  return Number.parseFloat(trimmed);
}

function parseOklch(body: string): Rgba | null {
  const [channelPart, alphaPart] = body.split('/');
  const channels = channelPart.trim().split(/[\s,]+/).filter(Boolean);
  if (channels.length < 3) return null;

  const lightness = channels[0].endsWith('%')
    ? Number.parseFloat(channels[0]) / 100
    : Number.parseFloat(channels[0]);
  const chroma = channels[1].endsWith('%')
    ? (Number.parseFloat(channels[1]) / 100) * 0.4
    : Number.parseFloat(channels[1]);
  const hue = parseHue(channels[2]);

  if (![lightness, chroma, hue].every(Number.isFinite)) return null;
  if (lightness < 0 || lightness > 1 || chroma < 0) return null;

  const rgb = oklchToSrgb(lightness, chroma, hue);
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: parseAlpha(alphaPart),
  };
}

/**
 * Convierte OKLCH a sRGB de 8 bits.
 * OKLab → LMS cúbico → sRGB lineal → transferencia sRGB.
 */
export function oklchToSrgb(
  lightness: number,
  chroma: number,
  hue: number,
): { r: number; g: number; b: number } {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const encode = (channel: number): number => {
    const clamped = clamp(channel, 0, 1);
    const srgb = clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return clampByte(srgb * 255);
  };

  return { r: encode(linearR), g: encode(linearG), b: encode(linearB) };
}

/**
 * Parsea hex, funciones rgb/rgba, funciones OKLCH y los nombres white, black y transparent.
 */
export function parseCssColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;

  const named = NAMED_COLORS[value];
  if (named) return { ...named };

  if (value.startsWith('#')) return parseHex(value);

  const rgbMatch = value.match(/^rgba?\((.*)\)$/);
  if (rgbMatch) return parseRgb(rgbMatch[1]);

  const oklchMatch = value.match(/^oklch\((.*)\)$/);
  if (oklchMatch) return parseOklch(oklchMatch[1]);

  return null;
}

/**
 * Devuelve un hex de 6 u 8 dígitos (con alfa) o null si no puede parsear.
 */
export function toHex(input: string): string | null {
  const color = parseCssColor(input);
  if (!color) return null;
  const pair = (channel: number): string => channel.toString(16).padStart(2, '0');
  const base = '#' + pair(color.r) + pair(color.g) + pair(color.b);
  return color.a >= 0.999 ? base : base + pair(Math.round(color.a * 255));
}

function linearChannel(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string): number {
  const parsed = parseCssColor(color);
  if (!parsed) return 0;
  const r = linearChannel(parsed.r);
  const g = linearChannel(parsed.g);
  const b = linearChannel(parsed.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  if (!parseCssColor(a) || !parseCssColor(b)) return 1;
  const luminanceA = relativeLuminance(a);
  const luminanceB = relativeLuminance(b);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastText(
  background: string,
  options: { light?: string; dark?: string } = {},
): string {
  const hasDocument = typeof document !== 'undefined';
  const light = options.light
    ?? (hasDocument ? readToken('--color-on-brand') || 'white' : 'white');
  const dark = options.dark
    ?? (hasDocument ? readToken('--color-ink') || 'black' : 'black');
  return contrastRatio(background, light) >= contrastRatio(background, dark)
    ? light
    : dark;
}

function normalizeTokenName(name: string): string {
  const body = name.trim().replace(/^--/, '');
  const kebab = body
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return '--' + kebab;
}

/**
 * Lee un custom property del documento. Cachea por tema y no guarda vacíos.
 * Fuera del navegador devuelve ''.
 */
export function readToken(name: string): string {
  if (typeof document === 'undefined') return '';
  const token = normalizeTokenName(name);
  const theme = document.documentElement.dataset.bsTheme ?? 'light';
  const key = theme + '|' + token;
  const cached = tokenCache.get(key);
  if (cached !== undefined) return cached;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (value) tokenCache.set(key, value);
  return value;
}

export function clearTokenCache(): void {
  tokenCache.clear();
}
