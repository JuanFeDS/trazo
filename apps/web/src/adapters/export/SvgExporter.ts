import { suggestFileName, type ExportedFile, type ExportRequest, type Exporter } from '@trazo/core';
import { renderScene } from './renderScene';

export class SvgExporter implements Exporter {
  readonly format = 'svg' as const;

  async export(request: ExportRequest): Promise<ExportedFile> {
    const { svg } = await renderScene(request);
    return {
      fileName: suggestFileName(request.diagram.title, 'svg'),
      mimeType: 'image/svg+xml',
      data: svg,
    };
  }
}
