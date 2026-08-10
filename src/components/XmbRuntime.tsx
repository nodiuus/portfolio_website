import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import PspWave from "../PspWave";
import ShadertoyTheme from "../ShadertoyTheme";
import type { BlogPost, MusicTrack, ThemePalette, XmbAction, XmbBackgroundTheme, XmbCategory, XmbItem, XmbSettingsSection, XmbTheme, XmbView } from "../types";
import { BookingModal } from "./BookingModal";
import { BlogExperience } from "./BlogExperience";
import { DetailContent } from "./DetailContent";
import { MusicExperience } from "./MusicExperience";
import { ThemePanel } from "./ThemePanel";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const lockedThemeFallback: ThemePalette = {
  start: "#08090c",
  middle: "#242832",
  end: "#687080",
  glow: "rgba(135, 145, 165, 0.28)",
  wavePrimary: "rgba(150, 160, 180, 0.42)",
  waveSecondary: "rgba(105, 115, 135, 0.24)",
  waveTertiary: "rgba(75, 82, 98, 0.18)",
};

type XmbRuntimeProps = {
  categories: XmbCategory[];
  view: XmbView;
  activeCategory: number;
  activeItem: number;
  activeDrillItem: number;
  activeAction: number;
  drillOpen: boolean;
  childOpen: boolean;
  detailItem: XmbItem;
  drillItems: XmbItem[];
  animated: boolean;
  themes: XmbTheme[];
  activeTheme: XmbTheme;
  customPrimary: string;
  customSecondary: string;
  backgroundThemes: XmbBackgroundTheme[];
  activeBackgroundTheme: XmbBackgroundTheme;
  settingsOpen: boolean;
  settingsSection: XmbSettingsSection;
  settingsMenuIndex: number;
  settingsColorMenuIndex: number;
  tracks: MusicTrack[];
  activeTrack: number;
  musicPlayerOpen: boolean;
  posts: BlogPost[];
  activePost: number;
  blogReaderOpen: boolean;
  availabilityIndex: number;
  bookingOpen: boolean;
  bookingUrl?: string;
  soundEnabled: boolean;

  onSoundToggle: () => void;
  onSoundError: () => void;
  onViewSelect: (view: XmbView) => void;
  onCategorySelect: (index: number) => void;
  onSettingsOpen: () => void;
  onSettingsClose: () => void;
  onSettingsSectionChange: (section: XmbSettingsSection) => void;
  onSettingsMenuSelect: (index: number) => void;
  onSettingsColorMenuSelect: (index: number) => void;
  onThemeSelect: (index: number) => void;
  onCustomColorChange: (slot: "primary" | "secondary", color: string) => void;
  onBackgroundThemeSelect: (index: number) => void;
  onItemSelect: (index: number) => void;
  onItemActivate: (index: number) => void;
  onDrillItemSelect: (index: number) => void;
  onDrillItemActivate: (index: number) => void;
  onActionSelect: (index: number) => void;
  onTrackSelect: (index: number) => void;
  onTrackActivate: (index: number) => void;
  onMusicPlayerClose: () => void;
  onPostSelect: (index: number) => void;
  onPostActivate: (index: number) => void;
  onBlogReaderClose: () => void;
  onAvailabilitySelect: (index: number) => void;
  onBookingOpen: () => void;
  onBookingClose: () => void;
  onBookingContinue: () => void;
};

export function XmbRuntime(props: XmbRuntimeProps) {
  const [now, setNow] = createSignal(new Date());
  const [lockedThemePalette, setLockedThemePalette] = createSignal<ThemePalette>();
  let timer = 0;

  createEffect(() => {
    props.activeBackgroundTheme.id;
    setLockedThemePalette(undefined);
  });

  const themeIsColorLocked = () => props.activeBackgroundTheme.supportsColor === false;
  const chromePalette = () => themeIsColorLocked()
    ? lockedThemePalette() ?? lockedThemeFallback
    : props.activeTheme.palette;
  const chromeAccent = () => themeIsColorLocked() ? chromePalette().end : props.activeTheme.accent;
  const activeColumn = () => props.view === "portfolio"
    ? props.activeCategory
    : props.categories.length;

  onMount(() => {
    timer = window.setInterval(() => setNow(new Date()), 15_000);
  });
  onCleanup(() => window.clearInterval(timer));

  const follow = (action: XmbAction) => {
    if (action.href.startsWith("mailto:")) window.location.href = action.href;
    else window.open(action.href, "_blank", "noopener,noreferrer");
  };

  return (
    <main
      class="xmb-screen"
      role="application"
      aria-label="Nisan portfolio XMB interface"
      data-view={props.view}
      data-theme={props.activeBackgroundTheme.id}
      data-color={props.activeTheme.id}
      data-theme-chrome={themeIsColorLocked() ? (lockedThemePalette() ? "sampled" : "neutral") : "color"}
      data-settings-open={props.settingsOpen}
      data-drill-open={props.drillOpen}
      data-child-open={props.childOpen}
      data-blog-open={props.blogReaderOpen}
      data-booking-open={props.bookingOpen}

      style={{
        "--theme-accent": chromeAccent(),
        "--theme-panel-deep": chromePalette().start,
        "--theme-panel-mid": chromePalette().middle,
        "--theme-panel-light": chromePalette().end,
        "--theme-wave-accent": chromePalette().wavePrimary,
      }}
    >
      <Show when={props.activeBackgroundTheme.kind === "wave"}>
        <PspWave animated={props.animated} palette={props.activeTheme.palette} />
      </Show>
      <Show when={props.activeBackgroundTheme.kind === "shader" && props.activeBackgroundTheme} keyed>
        {(theme) => (
          <ShadertoyTheme
            animated={props.animated}
            palette={props.activeTheme.palette}
            shader={theme.shader!}
            buffers={theme.shaderBuffers}
            onThemePalette={theme.supportsColor === false ? setLockedThemePalette : undefined}
          />
        )}
      </Show>

      <header class="xmb-system-nav">
        <div class="xmb-system-actions" aria-label="System actions">
          <button type="button" class="xmb-system-action" aria-label="Search" aria-disabled="true" title="Search" onClick={props.onSoundError}>
            <img src="/psp/icons/ps3/search.png" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="xmb-system-action xmb-sound-toggle"
            classList={{ "is-active": props.soundEnabled, "is-muted": !props.soundEnabled }}
            aria-label={props.soundEnabled ? "Mute menu sounds" : "Enable menu sounds"}
            aria-pressed={props.soundEnabled}
            title={`Menu sounds: ${props.soundEnabled ? "On" : "Off"} (Ctrl + M)`}
            onClick={props.onSoundToggle}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.2v5.6h4l5 4V5l-5 4.2H4Z" />
              <path class="xmb-sound-waves" d="M16 8.2c1.1 1 1.6 2.2 1.6 3.8S17.1 14.8 16 15.8M18.7 5.7c1.8 1.7 2.8 3.8 2.8 6.3s-1 4.6-2.8 6.3" />
              <path class="xmb-sound-muted-mark" d="m16.5 9 5 6m0-6-5 6" />
            </svg>
          </button>
          <button
            type="button"
            class="xmb-system-action"
            classList={{ "is-active": props.settingsOpen }}
            aria-label="Settings"
            aria-expanded={props.settingsOpen}
            title="Theme Settings (Ctrl + ↑)"
            onClick={props.onSettingsOpen}
          >
            <img src="/psp/icons/ps3/settings.png" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="xmb-system-action"
            classList={{ "is-active": props.view === "portfolio" && props.activeCategory === 0 }}
            aria-label="Profile"
            onClick={() => props.onCategorySelect(0)}
          >
            <img src="/psp/icons/ps3/user.png" alt="" aria-hidden="true" />

          </button>
          <time class="xmb-clock" dateTime={now().toISOString()}>{timeFormatter.format(now())}</time>
        </div>
      </header>

      <section class="xmb-category-strip" aria-label="Main XMB categories">
          <div class="xmb-category-track" data-drill-open={props.drillOpen} data-child-open={props.childOpen}>
            <For each={props.categories}>
              {(category, index) => {
                const active = () => props.view === "portfolio" && props.activeCategory === index();
                return (
                  <button
                    type="button"
                    class="xmb-category"
                    classList={{ "is-active": active() }}
                    aria-label={category.label}
                    aria-current={active() ? "page" : undefined}
                    onClick={() => props.onCategorySelect(index())}
                    style={{
                      "--xmb-category-offset": `calc(${index() - activeColumn()} * var(--xmb-category-step))`,
                    }}
                  >
                    <img src={category.icon} alt="" draggable={false} />
                    <span class="xmb-category-label">{category.label}</span>
                  </button>
                );
              }}
            </For>
            <button
              type="button"
              class="xmb-category"
              classList={{ "is-active": props.view === "blog" }}
              aria-label="Blog"
              aria-current={props.view === "blog" ? "page" : undefined}
              onClick={() => props.onViewSelect("blog")}
              style={{
                "--xmb-category-offset": `calc(${props.categories.length - activeColumn()} * var(--xmb-category-step))`,
              }}
            >
              <img src="/psp/icons/document.svg" alt="" draggable={false} />
              <span class="xmb-category-label">Blog</span>
            </button>
          </div>
      </section>

      <Show when={props.view === "portfolio"}>
        <section class="xmb-items" aria-label="Category items" data-drill-open={props.drillOpen} data-child-open={props.childOpen}>
          <ul class="xmb-item-list" role="listbox" aria-live="polite">
            <For each={props.categories[props.activeCategory].items}>
              {(item, index) => {
                const level = () => index() - props.activeItem;
                const active = () => level() === 0;
                return (
                  <li
                    class="xmb-item"
                    classList={{ "is-active": active(), "is-above": level() < 0, "is-hidden": level() < -1 || level() > 2 }}
                    role="option"
                    aria-selected={active()}
                    data-kind={item.kind ?? "item"}
                    data-level={level()}
                    data-item-id={item.id}
                    style={{ "--xmb-item-offset": `calc(${level()} * var(--xmb-item-step))` }}
                    onClick={() => active() ? props.onItemActivate(index()) : props.onItemSelect(index())}
                  >
                    <span class="xmb-item-icon-slot" aria-hidden="true">
                      <img class="xmb-item-icon" src={item.icon ?? "/psp/icons/folder.svg"} alt="" draggable={false} />
                    </span>
                    <div class="xmb-item-copy">
                      <span class="xmb-item-label">{item.label}</span>
                      <span class="xmb-item-desc">{item.description}</span>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </section>

        <Show when={props.drillOpen && props.drillItems.length > 0}>
          <aside
            class="xmb-game-library"
            classList={{
              "is-project-0": props.activeDrillItem === 0,
              "is-project-1": props.activeDrillItem === 1,
              "is-project-2": props.activeDrillItem === 2,
            }}
            data-child-open={props.childOpen}
            aria-label="Project Library"
          >
            <img class="xmb-game-library-arrow" src="/psp/icons/arrow.svg" alt="" aria-hidden="true" />
            <div class="xmb-game-list" role="listbox" aria-live="polite">
              <For each={props.drillItems}>
                {(item, index) => {
                  const level = () => index() - props.activeDrillItem;
                  const active = () => level() === 0;
                  return (
                    <button
                      type="button"
                      class="xmb-game-entry"
                      classList={{ "is-active": active(), "is-above": level() < 0, "is-hidden": Math.abs(level()) > 1 }}
                      role="option"
                      aria-selected={active()}
                      data-level={level()}
                      onClick={() => active() ? props.onDrillItemActivate(index()) : props.onDrillItemSelect(index())}
                    >
                      <span class="xmb-game-art"><img src={item.art?.src} alt={item.art?.alt ?? ""} draggable={false} /></span>
                      <span class="xmb-game-copy"><strong>{item.label}</strong><span>{item.description}</span><time>{item.completed}</time></span>
                    </button>
                  );
                }}
              </For>
            </div>
            <div class="xmb-game-library-status" aria-hidden="true">
              <span>Project Library</span>
              <b>{String(props.activeDrillItem + 1).padStart(2, "0")} / {String(props.drillItems.length).padStart(2, "0")}</b>
            </div>
          </aside>
        </Show>

        <aside class="xmb-child-panel" data-open={props.childOpen} aria-hidden={!props.childOpen}>
          <div class="xmb-child-panel-inner">
            <header class="xmb-child-panel-header">
              <img class="xmb-child-panel-arrow" src="/psp/icons/arrow.svg" alt="" aria-hidden="true" />
              <div>
                <span>{props.drillOpen ? "Project Library" : props.categories[props.activeCategory].label}</span>
                <h2>{props.detailItem.label}</h2>
              </div>
            </header>

            <div class="xmb-child-panel-body" data-detail-id={props.detailItem.id}>
              <Show when={props.detailItem.completed}><time class="xmb-detail-date">{props.detailItem.completed}</time></Show>
              <DetailContent
                item={props.detailItem}
                activeAction={props.activeAction}
                availabilityIndex={props.availabilityIndex}
                onAvailabilitySelect={props.onAvailabilitySelect}
                onBookMeeting={props.onBookingOpen}
                onActionSelect={props.onActionSelect}
                onFollow={follow}
              />
            </div>

            <footer class="xmb-child-panel-footer">
              <span><kbd class="xmb-control-key">Esc</kbd> Back</span>
              <Show when={props.detailItem.actions?.length || props.detailItem.id === "availability"}>
                <span><kbd class="xmb-control-key">Enter</kbd> Open</span>
              </Show>
            </footer>
          </div>
        </aside>
      </Show>

      <Show when={props.view === "media"}>
        <MusicExperience
          tracks={props.tracks}
          activeTrack={props.activeTrack}
          playerOpen={props.musicPlayerOpen}
          onTrackSelect={props.onTrackSelect}
          onTrackActivate={props.onTrackActivate}
          onClosePlayer={props.onMusicPlayerClose}
        />
      </Show>

      <Show when={props.view === "blog"}>
        <BlogExperience
          posts={props.posts}
          activePost={props.activePost}
          readerOpen={props.blogReaderOpen}
          onPostSelect={props.onPostSelect}
          onPostActivate={props.onPostActivate}
          onReaderClose={props.onBlogReaderClose}
        />
      </Show>

      <ThemePanel
        open={props.settingsOpen}
        section={props.settingsSection}
        activeMenuIndex={props.settingsMenuIndex}
        activeColorMenuIndex={props.settingsColorMenuIndex}
        backgroundThemes={props.backgroundThemes}
        activeBackgroundTheme={props.activeBackgroundTheme.id}
        colors={props.themes}
        activeColor={props.activeTheme.id}
        customPrimary={props.customPrimary}
        customSecondary={props.customSecondary}
        animated={props.animated}
        onMenuSelect={props.onSettingsMenuSelect}
        onColorMenuSelect={props.onSettingsColorMenuSelect}
        onSectionChange={props.onSettingsSectionChange}
        onBackgroundThemeSelect={props.onBackgroundThemeSelect}
        onColorSelect={props.onThemeSelect}
        onCustomColorChange={props.onCustomColorChange}
        onClose={props.onSettingsClose}
      />

      <BookingModal
        open={props.bookingOpen}
        selectedIndex={props.availabilityIndex}
        bookingUrl={props.bookingUrl}
        onSelect={props.onAvailabilitySelect}
        onClose={props.onBookingClose}
        onContinue={props.onBookingContinue}
      />

      <footer class="xmb-footer-hints" aria-hidden="true">
        <span><kbd class="xmb-control-key">Esc</kbd> Back</span>
        <span><kbd class="xmb-control-key">Enter</kbd> {props.view === "media" ? "Play" : props.view === "blog" ? "Read" : props.drillOpen ? "Open project" : "Open"}</span>
        <span><kbd class="xmb-control-key">Ctrl</kbd><b aria-hidden="true">+</b><kbd class="xmb-control-key">↑</kbd> Themes</span>
      </footer>
    </main>
  );
}
