import { suggestFileName, type ExportedFile, type ExportRequest, type Exporter } from '@trazo/core';
import { renderScene } from './renderScene';

const SCALE = 2;
const MAX_SIDE = 8192;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo dibujar el diagrama como imagen'));
    image.src = url;
  });
}

export class PngExporter implements Exporter {
  readonly format = 'png' as const;

  async export(request: ExportRequest): Promise<ExportedFile> {
    const { svg, width, height } = await renderScene(request);
    const scale = Math.min(SCALE, MAX_SIDE / Math.max(width, height));
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = await loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('El navegador no permite dibujar en un lienzo');
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('No se pudo generar el PNG');
      }
      return {
        fileName: suggestFileName(request.diagram.title, 'png'),
        mimeType: 'image/png',
        data: new Uint8Array(await blob.arrayBuffer()),
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
