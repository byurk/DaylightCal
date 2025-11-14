const hexToRgb = (color: string) => {
  const normalized = color.replace('#', '');
  const hex = normalized.length === 3 ? normalized.repeat(2) : normalized;
  const int = Number.parseInt(hex, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

export const getTextColorForBackground = (color?: string) => {
  if (!color) return '#ffffff';
  const rgb = hexToRgb(color);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
};
