const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Geist:wght@600&family=Geist+Mono:wght@500&family=Sora:wght@800&display=swap';

const FACE_PATTERN = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
const URL_PATTERN = /url\((https:[^)]+)\)/;

function toBase64(buffer: ArrayBuffer): string {
  let binary = '';
  new Uint8Array(buffer).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function embedFace(body: string): Promise<string> {
  const source = URL_PATTERN.exec(body)?.[1];
  if (!source) {
    return '';
  }
  const response = await fetch(source);
  const data = toBase64(await response.arrayBuffer());
  return `@font-face {${body.replace(URL_PATTERN, `url(data:font/woff2;base64,${data})`)}}`;
}

async function loadEmbeddedCss(): Promise<string> {
  const css = await (await fetch(FONTS_URL)).text();
  // Solo el subconjunto latino: cubre el español y mantiene el archivo pequeño.
  const latinFaces = [...css.matchAll(FACE_PATTERN)].filter((match) => match[1] === 'latin');
  const embedded = await Promise.all(latinFaces.map((match) => embedFace(match[2] ?? '')));
  return embedded.join('\n');
}

let cached: Promise<string> | undefined;

// Sin conexión devuelve '' y el diagrama sale con las fuentes del sistema; no se guarda el fallo.
export function embeddedFontCss(): Promise<string> {
  cached ??= loadEmbeddedCss().catch(() => {
    cached = undefined;
    return '';
  });
  return cached;
}
