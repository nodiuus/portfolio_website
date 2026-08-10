import { createEffect, For, Show } from "solid-js";
import PspWave from "../PspWave";
import ShadertoyTheme from "../ShadertoyTheme";
import type { XmbBackgroundTheme, XmbSettingsSection, XmbTheme } from "../types";
import { KeyboardColorPicker } from "./KeyboardColorPicker";

type ThemePanelProps = {
  open: boolean;
  section: XmbSettingsSection;
  activeMenuIndex: number;
  activeColorMenuIndex: number;
  backgroundThemes: XmbBackgroundTheme[];
  activeBackgroundTheme: string;
  colors: XmbTheme[];
  activeColor: string;
  customPrimary: string;
  customSecondary: string;
  animated: boolean;
  onMenuSelect: (index: number) => void;
  onColorMenuSelect: (index: number) => void;
  onSectionChange: (section: XmbSettingsSection) => void;
  onBackgroundThemeSelect: (index: number) => void;
  onColorSelect: (index: number) => void;
  onCustomColorChange: (slot: "primary" | "secondary", color: string) => void;
  onClose: () => void;
};

export function ThemePanel(props: ThemePanelProps) {
  const selectedBackgroundTheme = () => (
    props.backgroundThemes.find((theme) => theme.id === props.activeBackgroundTheme) ?? props.backgroundThemes[0]
  );
  const selectedColor = () => props.colors.find((color) => color.id === props.activeColor) ?? props.colors[0];
  const colorEnabled = () => selectedBackgroundTheme().supportsColor !== false;
  const editingColor = () => props.section === "color-primary" || props.section === "color-secondary";
  const editingSlot = () => props.section === "color-secondary" ? "secondary" : "primary";
  let picker: HTMLDivElement | undefined;

  createEffect(() => {
    if (!props.open || props.section === "menu" || editingColor()) return;
    const selected = picker?.querySelector<HTMLButtonElement>("[data-nav-active='true'], [aria-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  });

  const goBack = () => props.section === "menu"
    ? props.onClose()
    : editingColor() ? props.onSectionChange("color") : props.onSectionChange("menu");
  const openSection = (index: number, section: "theme" | "color") => {
    if (section === "color" && !colorEnabled()) return;
    props.onMenuSelect(index);
    props.onSectionChange(section);
  };
  const menuActive = (index: number) => props.section === "menu"
    ? props.activeMenuIndex === index
    : (index === 0 && props.section === "theme") || (index === 1 && props.section.startsWith("color"));
  const panelTitle = () => props.section === "color-primary"
    ? "Primary Color"
    : props.section === "color-secondary" ? "Secondary Color" : "Theme Settings";

  return (
    <aside class="xmb-theme-panel" data-open={props.open} aria-hidden={!props.open} aria-label="Theme Settings">
      <div class="xmb-theme-panel-inner">
        <header class="xmb-theme-panel-header">
          <button
            type="button"
            aria-label={props.section === "menu" ? "Close theme settings" : "Go back"}
            onClick={goBack}
          >
            ‹
          </button>
          <h2>{panelTitle()}</h2>
        </header>

        <div class="xmb-theme-panel-body" data-section={props.section}>
          <Show when={!editingColor()}>
            <div class="xmb-theme-menu" role="listbox" aria-label="Theme settings menu">
              <button
                type="button"
                class="xmb-theme-menu-item"
                classList={{ "is-active": menuActive(0) }}
                aria-selected={menuActive(0)}
                onMouseEnter={() => props.onMenuSelect(0)}
                onClick={() => openSection(0, "theme")}
              >
                <img src="/psp/icons/ps3/settings.png" alt="" aria-hidden="true" />
                <span>Theme</span>
                <b>{selectedBackgroundTheme().label}</b>
              </button>
              <button
                type="button"
                class="xmb-theme-menu-item"
                classList={{ "is-active": menuActive(1), "is-disabled": !colorEnabled() }}
                aria-selected={menuActive(1)}
                aria-disabled={!colorEnabled()}
                disabled={!colorEnabled()}
                onMouseEnter={() => colorEnabled() && props.onMenuSelect(1)}
                onClick={() => openSection(1, "color")}
              >
                <img src="/psp/icons/ps3/display-settings.png" alt="" aria-hidden="true" />
                <span>Color</span>
                <b>{colorEnabled() ? selectedColor().label : "Locked"}</b>
              </button>
            </div>
          </Show>

          <Show when={props.section === "theme"}>
            <div ref={picker} class="xmb-background-theme-picker" role="listbox" aria-label="Background themes">
              <For each={props.backgroundThemes}>
                {(theme, index) => (
                  <button
                    type="button"
                    class="xmb-background-theme-option"
                    classList={{ "is-active": theme.id === props.activeBackgroundTheme }}
                    aria-label={theme.label}
                    aria-selected={theme.id === props.activeBackgroundTheme}
                    onClick={() => props.onBackgroundThemeSelect(index())}
                  >
                    <span class="xmb-background-theme-preview" style={{ background: theme.preview }}>
                      <Show when={theme.kind === "wave"}>
                        <PspWave animated={props.animated} palette={selectedColor().palette} preview />
                      </Show>
                      <Show when={theme.kind === "shader"}>
                        <ShadertoyTheme
                          animated={props.animated}
                          palette={selectedColor().palette}
                          shader={theme.shader!}
                          buffers={theme.shaderBuffers}
                          preview
                        />
                      </Show>
                    </span>
                    <b>{theme.label}</b>
                  </button>
                )}
              </For>
            </div>
          </Show>

          <Show when={props.section === "color"}>
            <div ref={picker} class="xmb-theme-picker" aria-label="Colors">
              <div class="xmb-custom-color-controls" classList={{ "is-active": props.activeColor === "custom" }}>
                <span class="xmb-custom-color-title">Custom colors</span>
                <For each={(["primary", "secondary"] as const)}>
                  {(slot, index) => {
                    const value = () => slot === "primary" ? props.customPrimary : props.customSecondary;
                    return (
                      <button
                        type="button"
                        classList={{ "is-nav-active": props.activeColorMenuIndex === index() }}
                        data-nav-active={props.activeColorMenuIndex === index()}
                        onMouseEnter={() => props.onColorMenuSelect(index())}
                        onClick={() => props.onSectionChange(slot === "primary" ? "color-primary" : "color-secondary")}
                      >
                        <span><b>{slot === "primary" ? "Primary" : "Secondary"}</b><small>{value().toUpperCase()}</small></span>
                        <i style={{ background: value() }} aria-hidden="true" />
                        <em>›</em>
                      </button>
                    );
                  }}
                </For>
              </div>
              <div class="xmb-theme-swatch-list" role="listbox" aria-label="Color presets">
                <For each={props.colors}>
                  {(color, index) => (
                    <button
                      type="button"
                      class="xmb-theme-swatch"
                      classList={{
                        "is-active": color.id === props.activeColor,
                        "is-nav-active": props.activeColorMenuIndex === index() + 2,
                      }}
                      data-nav-active={props.activeColorMenuIndex === index() + 2}
                      aria-label={color.label}
                      aria-selected={color.id === props.activeColor}
                      onMouseEnter={() => props.onColorMenuSelect(index() + 2)}
                      onClick={() => {
                        props.onColorMenuSelect(index() + 2);
                        props.onColorSelect(index());
                      }}
                    >
                      <span style={{ "--theme-swatch": color.swatch }} />
                      <b>{color.label}</b>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <Show when={editingColor()}>
            <KeyboardColorPicker
              label={editingSlot() === "primary" ? "Primary" : "Secondary"}
              color={editingSlot() === "primary" ? props.customPrimary : props.customSecondary}
              onChange={(color) => props.onCustomColorChange(editingSlot(), color)}
            />
          </Show>
        </div>

        <footer>
          <span><kbd class="xmb-control-key">Esc</kbd> Back</span>
          <span>
            {props.section === "menu"
              ? <><kbd class="xmb-control-key">Enter</kbd> Open</>
              : editingColor()
                ? <><kbd class="xmb-control-key">Enter</kbd> Done</>
                : <><kbd class="xmb-control-key">↑</kbd><kbd class="xmb-control-key">↓</kbd> Select {props.section}</>}
          </span>
        </footer>
      </div>
    </aside>
  );
}
