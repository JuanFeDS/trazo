export interface Palette {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  hot: string;
  edge: string;
}

const TOKENS: Record<keyof Palette, string> = {
  bg: '--color-bg',
  surface: '--color-surface',
  ink: '--color-ink',
  muted: '--color-muted',
  primary: '--color-primary',
  onPrimary: '--color-on-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  hot: '--color-hot',
  edge: '--edge-color',
};

function toHex(cssColor: string): string {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) {
    return '#000000';
  }
  context.fillStyle = '#000000';
  context.fillStyle = cssColor;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

// El SVG exportado lleva hex plano (no oklch ni color-mix) para abrirse igual en cualquier editor.
export function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const resolved = Object.fromEntries(
    Object.entries(TOKENS).map(([key, token]) => [key, toHex(styles.getPropertyValue(token).trim())]),
  );
  return resolved as unknown as Palette;
}
