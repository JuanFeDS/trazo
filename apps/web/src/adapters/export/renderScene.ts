import type { ExportRequest } from '@trazo/core';
import { embeddedFontCss } from './fonts';
import { readPalette } from './palette';
import { buildSvg, type Scene } from './scene';

const FONTS_TO_LOAD = ['600 15px Geist', '500 12px "Geist Mono"', '800 18px Sora'];

async function ensureFonts(): Promise<void> {
  try {
    await Promise.all(FONTS_TO_LOAD.map((font) => document.fonts.load(font)));
  } catch {
    // Sin las fuentes cargadas el texto se mide con las del sistema; el resultado sigue siendo válido.
  }
}

export async function renderScene(request: ExportRequest): Promise<Scene> {
  await ensureFonts();
  const context = document.createElement('canvas').getContext('2d');
  const measure = (text: string, font: string): number => {
    if (!context) {
      return text.length * 8;
    }
    context.font = font;
    return context.measureText(text).width;
  };
  return buildSvg(request, { palette: readPalette(), measure, fontCss: await embeddedFontCss() });
}
