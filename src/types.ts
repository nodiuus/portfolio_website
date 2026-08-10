export type XmbAction = {
  label: string;
  href: string;
};

export type XmbItem = {
  id?: string;
  label: string;
  description: string;
  body: string;
  kind?: "item" | "folder" | "game";
  icon?: string;
  art?: {
    src: string;
    alt: string;
  };
  completed?: string;
  children?: XmbItem[];
  resume?: {
    organization: string;
    period: string;
    location?: string;
    highlights: string[];
  };
  meta?: string[];
  actions?: XmbAction[];
};

export type XmbCategory = {
  id: string;
  label: string;
  icon: string;
  items: XmbItem[];
};

export type ThemePalette = {
  start: string;
  middle: string;
  end: string;
  glow: string;
  wavePrimary: string;
  waveSecondary: string;
  waveTertiary: string;
};

export type XmbTheme = {
  id: string;
  label: string;
  swatch: string;
  accent: string;
  palette: ThemePalette;
};

export type XmbBackgroundTheme = {
  id: string;
  label: string;
  kind: "wave" | "shader";
  preview: string;
  shader?: string;
  shaderBuffers?: Array<string | undefined>;
  supportsColor?: boolean;
};

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  accent: string;
  duration?: string;
  playbackUrl?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  summary: string;
  published: string;
  readTime: string;
  category: string;
  author: string;
  tags: string[];
  markdown: string;
};

export type AvailabilityOption = {
  id: string;
  label: string;
  detail: string;
  note: string;
};

export type XmbView = "portfolio" | "media" | "blog";
export type XmbDirection = "left" | "right" | "up" | "down";
export type XmbSettingsSection = "menu" | "theme" | "color" | "color-primary" | "color-secondary";
