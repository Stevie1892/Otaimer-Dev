export const PRESET_COLORS = [
  '#FF6B6B', '#FF8E72', '#FFA07A', '#FF7F50',
  '#45B7D1', '#4ECDC4', '#48DBFB', '#00D2D3',
  '#96CEB4', '#2ECC71', '#27AE60', '#1ABC9C',
  '#FFEAA7', '#FDCB6E', '#F9CA24', '#E17055',
  '#DDA0DD', '#A29BFE', '#6C5CE7', '#BB8FCE',
  '#98D8C8', '#55EFC4', '#00B894', '#81ECEC',
  '#F7DC6F', '#EAB543', '#F8B500', '#F97F51',
  '#85C1E9', '#3498DB', '#2980B9', '#0984E3',
  '#FF7675', '#FD79A8', '#E84393', '#D63031',
  '#636E72', '#B2BEC3', '#DFE6E9', '#74B9FF'
];

export function randomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}
