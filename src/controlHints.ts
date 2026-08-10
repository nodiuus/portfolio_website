import type { XmbControlScheme } from "./types";

type ControlLabels = {
  back: string;
  confirm: string;
  themes: string;
  move: string;
  hueDown: string;
  hueUp: string;
};

const labels: Record<XmbControlScheme, ControlLabels> = {
  keyboard: {
    back: "Esc",
    confirm: "Enter",
    themes: "Ctrl + ↑",
    move: "Arrow keys",
    hueDown: "Q",
    hueUp: "E",
  },
  playstation: {
    back: "○",
    confirm: "×",
    themes: "△",
    move: "D-pad / L Stick",
    hueDown: "L1",
    hueUp: "R1",
  },
  xbox: {
    back: "B",
    confirm: "A",
    themes: "Y",
    move: "D-pad / L Stick",
    hueDown: "LB",
    hueUp: "RB",
  },
  generic: {
    back: "B",
    confirm: "A",
    themes: "Y",
    move: "D-pad / L Stick",
    hueDown: "L1",
    hueUp: "R1",
  },
};

export const getControlLabels = (scheme: XmbControlScheme) => labels[scheme];
export const usingController = (scheme: XmbControlScheme) => scheme !== "keyboard";
