import type { XmbBackgroundTheme, XmbTheme } from "../types";
import { shaderThemes } from "../themes/shaderThemes";

export const backgroundThemes: XmbBackgroundTheme[] = [
  {
    id: "original",
    label: "Original",
    kind: "wave",
    supportsColor: true,
    preview: "linear-gradient(145deg, #062282, #0a65c8 58%, #39a9df)",
  },
  ...shaderThemes,
];

export const defaultBackgroundTheme = backgroundThemes[0];

const monthlyTheme = (id: string, label: string, swatch: string, palette: XmbTheme["palette"]): XmbTheme => ({
  id,
  label,
  swatch,
  accent: swatch,
  palette,
});

export const themes: XmbTheme[] = [
  {
    id: "ocean",
    label: "Ocean",
    swatch: "linear-gradient(180deg, #09257e 0%, #0cb1de 100%)",
    accent: "#0cb1de",
    palette: {
      start: "#062282",
      middle: "#0a65c8",
      end: "#39a9df",
      glow: "rgba(126,214,255,.32)",
      wavePrimary: "rgba(113,217,255,.23)",
      waveSecondary: "rgba(118,225,255,.34)",
      waveTertiary: "rgba(195,242,255,.11)",
    },
  },
  monthlyTheme("january", "January", "#b2b5b3", {
    start: "#27343d", middle: "#6c7b81", end: "#b2b5b3", glow: "rgba(235,242,240,.22)",
    wavePrimary: "rgba(218,226,224,.18)", waveSecondary: "rgba(241,245,243,.25)", waveTertiary: "rgba(255,255,255,.09)",
  }),
  monthlyTheme("february", "February", "#f2c924", {
    start: "#47300a", middle: "#a66c10", end: "#d7a91b", glow: "rgba(255,231,113,.28)",
    wavePrimary: "rgba(255,211,73,.20)", waveSecondary: "rgba(255,238,147,.28)", waveTertiary: "rgba(255,250,219,.10)",
  }),
  monthlyTheme("march", "March", "#7af13d", {
    start: "#12351f", middle: "#297a43", end: "#57b957", glow: "rgba(171,255,130,.25)",
    wavePrimary: "rgba(107,225,120,.20)", waveSecondary: "rgba(172,255,145,.27)", waveTertiary: "rgba(232,255,224,.10)",
  }),
  monthlyTheme("april", "April", "#fd6cff", {
    start: "#3b174c", middle: "#8b3e9d", end: "#d86ed0", glow: "rgba(255,169,255,.24)",
    wavePrimary: "rgba(225,110,236,.20)", waveSecondary: "rgba(255,174,244,.28)", waveTertiary: "rgba(255,225,255,.10)",
  }),
  monthlyTheme("may", "May", "#32c525", {
    start: "#0d3a1c", middle: "#24773b", end: "#43aa45", glow: "rgba(133,255,119,.23)",
    wavePrimary: "rgba(79,210,92,.20)", waveSecondary: "rgba(143,244,131,.27)", waveTertiary: "rgba(220,255,213,.10)",
  }),
  monthlyTheme("june", "June", "#717ad4", {
    start: "#181e55", middle: "#434b9c", end: "#737fc6", glow: "rgba(159,169,255,.25)",
    wavePrimary: "rgba(116,129,227,.21)", waveSecondary: "rgba(166,175,255,.29)", waveTertiary: "rgba(226,230,255,.10)",
  }),
  monthlyTheme("july", "July", "#00d4aa", {
    start: "#063d45", middle: "#087f82", end: "#16b9a3", glow: "rgba(111,255,225,.24)",
    wavePrimary: "rgba(24,210,179,.20)", waveSecondary: "rgba(111,245,220,.28)", waveTertiary: "rgba(218,255,248,.10)",
  }),
  monthlyTheme("august", "August", "#12479e", {
    start: "#071b54", middle: "#123e91", end: "#2e70bd", glow: "rgba(103,166,255,.25)",
    wavePrimary: "rgba(44,112,203,.21)", waveSecondary: "rgba(103,171,255,.28)", waveTertiary: "rgba(216,234,255,.10)",
  }),
  monthlyTheme("september", "September", "#b4b2d7", {
    start: "#2b2955", middle: "#6a6798", end: "#a19fc7", glow: "rgba(216,214,255,.23)",
    wavePrimary: "rgba(172,169,223,.19)", waveSecondary: "rgba(220,218,255,.26)", waveTertiary: "rgba(248,247,255,.09)",
  }),
  monthlyTheme("october", "October", "#f4b423", {
    start: "#482609", middle: "#9d5b10", end: "#dd941c", glow: "rgba(255,211,108,.27)",
    wavePrimary: "rgba(236,153,46,.21)", waveSecondary: "rgba(255,211,112,.29)", waveTertiary: "rgba(255,240,211,.10)",
  }),
  monthlyTheme("november", "November", "#855b34", {
    start: "#291b19", middle: "#5d3c2c", end: "#8f6745", glow: "rgba(218,163,111,.21)",
    wavePrimary: "rgba(159,103,62,.18)", waveSecondary: "rgba(213,159,109,.24)", waveTertiary: "rgba(247,220,196,.09)",
  }),
  monthlyTheme("december", "December", "#e2bae2", {
    start: "#372344", middle: "#805c8c", end: "#bd93bf", glow: "rgba(249,218,255,.23)",
    wavePrimary: "rgba(214,168,220,.19)", waveSecondary: "rgba(247,211,250,.26)", waveTertiary: "rgba(255,246,255,.09)",
  }),
];

export const defaultTheme = themes[0];
