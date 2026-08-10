export type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

const clamp = (value: number, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, value));

export function hexToHsv(hex: string): HsvColor {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return {
    hue: (hue + 360) % 360,
    saturation: maximum ? (delta / maximum) * 100 : 0,
    value: maximum * 100,
  };
}

export function hsvToHex({ hue, saturation, value }: HsvColor) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = clamp(saturation) / 100;
  const normalizedValue = clamp(value) / 100;
  const chroma = normalizedValue * normalizedSaturation;
  const secondary = chroma * (1 - Math.abs((normalizedHue / 60) % 2 - 1));
  const match = normalizedValue - chroma;
  const channels = normalizedHue < 60 ? [chroma, secondary, 0]
    : normalizedHue < 120 ? [secondary, chroma, 0]
      : normalizedHue < 180 ? [0, chroma, secondary]
        : normalizedHue < 240 ? [0, secondary, chroma]
          : normalizedHue < 300 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];

  return `#${channels
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function adjustKeyboardColor(hex: string, direction: "left" | "right" | "up" | "down", fine = false) {
  const hsv = hexToHsv(hex);
  const step = fine ? 3 : 7;

  if (direction === "left") hsv.saturation = clamp(hsv.saturation - step);
  if (direction === "right") hsv.saturation = clamp(hsv.saturation + step);
  if (direction === "up") hsv.value = clamp(hsv.value + step);
  if (direction === "down") hsv.value = clamp(hsv.value - step);

  return hsvToHex(hsv);
}

export function rotateKeyboardHue(hex: string, offset: number) {
  const hsv = hexToHsv(hex);
  hsv.hue = (hsv.hue + offset + 360) % 360;
  return hsvToHex(hsv);
}
