import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { playXmbSound, preloadXmbSounds } from "./audio/xmbSounds";
import { adjustKeyboardColor, rotateKeyboardHue } from "./color";
import { XmbRuntime } from "./components/XmbRuntime";
import { availabilityOptions } from "./data/availability";
import { blogPosts } from "./data/blog";
import { musicTracks } from "./data/media";
import { categories } from "./data/portfolio";
import { backgroundThemes, defaultBackgroundTheme, defaultTheme, themes } from "./data/themes";
import type { XmbAction, XmbDirection, XmbSettingsSection, XmbTheme, XmbView } from "./types";

const validHexColor = (value: string | null, fallback: string) => /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback;

function hexChannels(color: string) {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
}

function darken(color: string, amount: number) {
  const channels = hexChannels(color).map((channel) => Math.round(channel * (1 - amount)));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function alpha(color: string, opacity: number) {
  const [red, green, blue] = hexChannels(color);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function makeCustomTheme(primary: string, secondary: string): XmbTheme {
  return {
    id: "custom",
    label: "Custom",
    swatch: `linear-gradient(135deg, ${primary}, ${secondary})`,
    accent: secondary,
    palette: {
      start: darken(primary, 0.68),
      middle: primary,
      end: secondary,
      glow: alpha(secondary, 0.3),
      wavePrimary: alpha(primary, 0.22),
      waveSecondary: alpha(secondary, 0.32),
      waveTertiary: alpha(secondary, 0.11),
    },
  };
}

function App() {
  const storedTheme = window.localStorage.getItem("nisan-xmb-theme");
  const initialTheme = storedTheme === "custom"
    ? themes.length
    : Math.max(0, themes.findIndex((theme) => theme.id === storedTheme));
  const storedBackgroundTheme = window.localStorage.getItem("nisan-xmb-background-theme");
  const initialBackgroundTheme = Math.max(0, backgroundThemes.findIndex((theme) => theme.id === storedBackgroundTheme));
  const bookingUrl = (import.meta.env.VITE_BOOKING_URL as string | undefined)?.trim();
  const initialBlogRoute = window.location.pathname.match(/^\/blog(?:\/([^/]+))?\/?$/);
  const initialPostIndex = initialBlogRoute?.[1]
    ? blogPosts.findIndex((post) => post.id === decodeURIComponent(initialBlogRoute[1]))
    : 0;

  const [view, setView] = createSignal<XmbView>(initialBlogRoute ? "blog" : "portfolio");
  const [activeCategory, setActiveCategory] = createSignal(0);
  const [activeItem, setActiveItem] = createSignal(0);
  const [activeDrillItem, setActiveDrillItem] = createSignal(0);
  const [activeAction, setActiveAction] = createSignal(0);
  const [drillOpen, setDrillOpen] = createSignal(false);
  const [childOpen, setChildOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [settingsSection, setSettingsSection] = createSignal<XmbSettingsSection>("menu");
  const [settingsMenuIndex, setSettingsMenuIndex] = createSignal(0);
  const [settingsColorMenuIndex, setSettingsColorMenuIndex] = createSignal(0);
  const [activeThemeIndex, setActiveThemeIndex] = createSignal(initialTheme);
  const [customPrimary, setCustomPrimary] = createSignal(validHexColor(window.localStorage.getItem("nisan-xmb-custom-primary"), "#0a65c8"));
  const [customSecondary, setCustomSecondary] = createSignal(validHexColor(window.localStorage.getItem("nisan-xmb-custom-secondary"), "#39a9df"));
  const [activeBackgroundThemeIndex, setActiveBackgroundThemeIndex] = createSignal(initialBackgroundTheme);
  const [activeTrack, setActiveTrack] = createSignal(0);
  const [musicPlayerOpen, setMusicPlayerOpen] = createSignal(false);
  const [activePost, setActivePost] = createSignal(Math.max(0, initialPostIndex));
  const [blogReaderOpen, setBlogReaderOpen] = createSignal(Boolean(initialBlogRoute?.[1] && initialPostIndex >= 0));
  const [availabilityIndex, setAvailabilityIndex] = createSignal(0);
  const [bookingOpen, setBookingOpen] = createSignal(false);
  const [soundEnabled, setSoundEnabled] = createSignal(window.localStorage.getItem("nisan-xmb-sound") !== "off");
  const animated = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const selectedCategory = createMemo(() => categories[activeCategory()]);
  const selectedItem = createMemo(() => selectedCategory().items[activeItem()] ?? selectedCategory().items[0]);
  const drillItems = createMemo(() => selectedItem().children ?? []);
  const selectedDrillItem = createMemo(() => drillItems()[activeDrillItem()] ?? drillItems()[0] ?? selectedItem());
  const detailItem = createMemo(() => (drillOpen() ? selectedDrillItem() : selectedItem()));
  const customTheme = createMemo(() => makeCustomTheme(customPrimary(), customSecondary()));
  const availableThemes = createMemo(() => [...themes, customTheme()]);
  const activeTheme = createMemo(() => availableThemes()[activeThemeIndex()] ?? defaultTheme);
  const activeBackgroundTheme = createMemo(() => backgroundThemes[activeBackgroundThemeIndex()] ?? defaultBackgroundTheme);

  createEffect(() => {
    window.localStorage.setItem("nisan-xmb-theme", activeTheme().id);
  });

  createEffect(() => {
    window.localStorage.setItem("nisan-xmb-background-theme", activeBackgroundTheme().id);
  });

  createEffect(() => {
    window.localStorage.setItem("nisan-xmb-sound", soundEnabled() ? "on" : "off");
  });

  createEffect(() => {
    window.localStorage.setItem("nisan-xmb-custom-primary", customPrimary());
    window.localStorage.setItem("nisan-xmb-custom-secondary", customSecondary());
  });

  const playSound = (sound: "move" | "confirm" | "back" | "error") => playXmbSound(sound, soundEnabled());

  function toggleSound() {
    const enabled = !soundEnabled();
    setSoundEnabled(enabled);
    if (enabled) window.setTimeout(() => playXmbSound("confirm", true), 0);
  }

  function setRoute(path: string, replace = false) {
    if (window.location.pathname === path) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  }

  function openBlogPage() {
    closeNestedStates();
    setSettingsOpen(false);
    setMusicPlayerOpen(false);
    setBlogReaderOpen(false);
    setView("blog");
    setRoute("/blog");
  }

  function openBlogPost(index: number) {
    const post = blogPosts[index] ?? blogPosts[0];
    setActivePost(Math.max(0, index));
    setBlogReaderOpen(true);
    setRoute(`/blog/${post.id}`);
  }

  function closeBlogPost() {
    setBlogReaderOpen(false);
    if (view() === "blog") setRoute("/blog");
  }

  function syncRouteFromLocation() {
    const match = window.location.pathname.match(/^\/blog(?:\/([^/]+))?\/?$/);
    if (!match) {
      if (view() === "blog") {
        setBlogReaderOpen(false);
        setView("portfolio");
      }
      return;
    }

    const index = match[1]
      ? blogPosts.findIndex((post) => post.id === decodeURIComponent(match[1]))
      : -1;
    setSettingsOpen(false);
    setMusicPlayerOpen(false);
    closeNestedStates();
    setView("blog");
    if (match[1] && index >= 0) {
      setActivePost(index);
      setBlogReaderOpen(true);
    } else {
      setBlogReaderOpen(false);
      if (match[1]) setRoute("/blog", true);
    }
  }

  function closeNestedStates() {
    setChildOpen(false);
    setDrillOpen(false);
    setActiveDrillItem(0);
    setActiveAction(0);
    setBookingOpen(false);
  }

  function jumpTo(index: number, item = 0) {
    setRoute("/");
    setView("portfolio");
    setSettingsOpen(false);
    setMusicPlayerOpen(false);
    setBlogReaderOpen(false);
    setActiveCategory(index);
    setActiveItem(item);
    closeNestedStates();
  }

  function selectCategory(index: number) {
    if (index === activeCategory() && !drillOpen() && !childOpen() && view() === "portfolio") return;
    jumpTo(index);
  }

  function selectView(nextView: XmbView) {
    setSettingsOpen(false);
    setBookingOpen(false);
    if (nextView === "media") {
      setRoute("/");
      closeNestedStates();
      setBlogReaderOpen(false);
      setView("media");
    } else if (nextView === "blog") {
      openBlogPage();
    } else {
      setRoute("/");
      setMusicPlayerOpen(false);
      setBlogReaderOpen(false);
      setView("portfolio");
    }
  }

  function openSettings() {
    setBookingOpen(false);
    setMusicPlayerOpen(false);
    if (view() === "blog") closeBlogPost();
    setSettingsSection("menu");
    setSettingsMenuIndex(0);
    setSettingsOpen(true);
  }

  function cycle(index: number, offset: number, length: number) {
    return (index + offset + length) % length;
  }

  function navigationSnapshot() {
    return [
      view(), activeCategory(), activeItem(), activeDrillItem(), activeAction(),
      drillOpen(), childOpen(), settingsOpen(), settingsSection(), settingsMenuIndex(), settingsColorMenuIndex(),
      activeThemeIndex(), activeBackgroundThemeIndex(), activeTrack(), musicPlayerOpen(),
      activePost(), blogReaderOpen(), availabilityIndex(), bookingOpen(), customPrimary(), customSecondary(),
    ].join("|");
  }

  function performNavigation(direction: XmbDirection, fine = false) {
    if (bookingOpen()) {
      if (direction === "up" || direction === "down") {
        setAvailabilityIndex((index) => cycle(index, direction === "down" ? 1 : -1, availabilityOptions.length));
      } else if (direction === "left") setBookingOpen(false);
      return;
    }

    if (settingsOpen()) {
      const offset = direction === "down" ? 1 : -1;
      const section = settingsSection();
      if (section === "color-primary" || section === "color-secondary") {
        const slot = section === "color-primary" ? "primary" : "secondary";
        const current = slot === "primary" ? customPrimary() : customSecondary();
        const color = adjustKeyboardColor(current, direction, fine);
        if (slot === "primary") setCustomPrimary(color);
        else setCustomSecondary(color);
        setActiveThemeIndex(themes.length);
      } else if ((direction === "up" || direction === "down") && section === "menu") {
        if (activeBackgroundTheme().supportsColor !== false) {
          setSettingsMenuIndex((index) => cycle(index, offset, 2));
        } else {
          setSettingsMenuIndex(0);
        }
      } else if ((direction === "up" || direction === "down") && section === "theme") {
        setActiveBackgroundThemeIndex((index) => cycle(index, offset, backgroundThemes.length));
      } else if ((direction === "up" || direction === "down") && section === "color") {
        const next = cycle(settingsColorMenuIndex(), offset, availableThemes().length + 2);
        setSettingsColorMenuIndex(next);
        if (next >= 2) setActiveThemeIndex(next - 2);
      } else if (direction === "left") {
        if (section !== "menu") setSettingsSection("menu");
        else setSettingsOpen(false);
      } else if (direction === "right" && section === "menu") {
        if (settingsMenuIndex() === 0) setSettingsSection("theme");
        else if (activeBackgroundTheme().supportsColor !== false) setSettingsSection("color");
      }
      return;
    }

    if (view() === "media") {
      if (musicPlayerOpen()) return;
      if (direction === "up" || direction === "down") {
        const maximum = musicTracks.length - 1;
        const offset = direction === "down" ? 1 : -1;
        setActiveTrack((index) => Math.min(maximum, Math.max(0, index + offset)));
      } else if (direction === "left") jumpTo(categories.length - 1);
      else if (direction === "right") selectView("blog");
      return;
    }

    if (view() === "blog") {
      if (blogReaderOpen()) {
        if (direction === "up" || direction === "down") {
          const reader = document.querySelector<HTMLElement>(".xmb-blog-article-scroll");
          reader?.scrollBy({
            top: (direction === "down" ? 1 : -1) * Math.max(140, Math.round(window.innerHeight * 0.22)),
            behavior: animated ? "smooth" : "auto",
          });
        } else if (direction === "left") closeBlogPost();
        return;
      }
      if (direction === "up" || direction === "down") {
        const maximum = blogPosts.length - 1;
        const offset = direction === "down" ? 1 : -1;
        setActivePost((index) => Math.min(maximum, Math.max(0, index + offset)));
      } else if (direction === "left") jumpTo(categories.length - 1);
      else if (direction === "right") jumpTo(0);
      return;
    }

    if (childOpen()) {
      if (detailItem().id === "availability" && (direction === "up" || direction === "down")) {
        setAvailabilityIndex((index) => cycle(index, direction === "down" ? 1 : -1, availabilityOptions.length));
        return;
      }
      const actions = detailItem().actions ?? [];
      if ((direction === "up" || direction === "down") && actions.length > 1) {
        const offset = direction === "down" ? 1 : -1;
        setActiveAction((index) => cycle(index, offset, actions.length));
      } else if (direction === "left") {
        setChildOpen(false);
      }
      return;
    }

    if (drillOpen()) {
      if (direction === "left") {
        setDrillOpen(false);
        setActiveDrillItem(0);
        return;
      }
      if (direction === "up" || direction === "down") {
        const maximum = drillItems().length - 1;
        const offset = direction === "down" ? 1 : -1;
        setActiveDrillItem((index) => Math.min(maximum, Math.max(0, index + offset)));
        setActiveAction(0);
      }
      return;
    }

    if (direction === "left" || direction === "right") {
      const offset = direction === "right" ? 1 : -1;
      const next = cycle(activeCategory(), offset, categories.length + 1);
      if (next === categories.length) selectView("blog");
      else selectCategory(next);
      return;
    }

    const maximum = selectedCategory().items.length - 1;
    const offset = direction === "down" ? 1 : -1;
    setActiveItem((index) => Math.min(maximum, Math.max(0, index + offset)));
    setActiveAction(0);
  }

  function navigate(direction: XmbDirection, fine = false) {
    const before = navigationSnapshot();
    performNavigation(direction, fine);
    if (navigationSnapshot() !== before) playSound("move");
  }

  function followAction(action: XmbAction) {
    if (action.href.startsWith("mailto:")) window.location.href = action.href;
    else window.open(action.href, "_blank", "noopener,noreferrer");
  }

  function continueBooking() {
    if (!bookingUrl) return;
    window.open(bookingUrl, "nisan-booking", "popup,width=1120,height=760,noopener,noreferrer");
  }

  function confirm() {
    playSound("confirm");
    if (bookingOpen()) {
      continueBooking();
      return;
    }
    if (settingsOpen()) {
      const section = settingsSection();
      if (section === "menu") {
        if (settingsMenuIndex() === 0) setSettingsSection("theme");
        else if (activeBackgroundTheme().supportsColor !== false) setSettingsSection("color");
      } else if (section === "color") {
        if (settingsColorMenuIndex() === 0) setSettingsSection("color-primary");
        else if (settingsColorMenuIndex() === 1) setSettingsSection("color-secondary");
      } else if (section === "color-primary" || section === "color-secondary") {
        setSettingsSection("color");
      }
      return;
    }

    if (view() === "media") {
      setMusicPlayerOpen(true);
      return;
    }
    if (view() === "blog") {
      openBlogPost(activePost());
      return;
    }
    if (childOpen()) {
      if (detailItem().id === "availability") {
        setBookingOpen(true);
        return;
      }
      const action = detailItem().actions?.[activeAction()];
      if (action) followAction(action);
      return;
    }
    if (drillOpen()) {
      setActiveAction(0);
      setChildOpen(true);
      return;
    }

    if (selectedItem().children?.length) {
      setActiveDrillItem(0);
      setDrillOpen(true);
      return;
    }
    setActiveAction(0);
    setChildOpen(true);
  }

  function back() {
    playSound("back");
    if (bookingOpen()) {
      setBookingOpen(false);
      return;
    }
    if (settingsOpen()) {
      if (settingsSection() === "color-primary" || settingsSection() === "color-secondary") setSettingsSection("color");
      else if (settingsSection() !== "menu") setSettingsSection("menu");
      else setSettingsOpen(false);
      return;
    }

    if (view() === "media") {
      if (musicPlayerOpen()) setMusicPlayerOpen(false);
      else setView("portfolio");
      return;
    }
    if (view() === "blog") {
      if (blogReaderOpen()) closeBlogPost();
      else {
        setRoute("/");
        setView("portfolio");
      }
      return;
    }
    if (childOpen()) {
      setChildOpen(false);
      return;
    }
    if (drillOpen()) {
      setDrillOpen(false);
      setActiveDrillItem(0);
      return;
    }
    if (activeItem() !== 0) {
      setActiveItem(0);
      return;
    }
    selectCategory(0);
  }

  function home() {
    setRoute("/");
    setView("portfolio");
    setSettingsOpen(false);
    setSettingsSection("menu");
    setMusicPlayerOpen(false);
    setBlogReaderOpen(false);
    setActiveCategory(0);
    setActiveItem(0);

    closeNestedStates();
  }

  onMount(() => {
    preloadXmbSounds();
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      if (event.ctrlKey && event.key === "ArrowUp") {
        event.preventDefault();
        playSound("confirm");
        openSettings();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleSound();
        return;
      }

      const direction: Record<string, XmbDirection> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      };
      if (direction[event.key]) {
        event.preventDefault();
        navigate(direction[event.key], event.shiftKey);
      } else if (settingsOpen() && (settingsSection() === "color-primary" || settingsSection() === "color-secondary") && ["q", "e"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        const slot = settingsSection() === "color-primary" ? "primary" : "secondary";
        const current = slot === "primary" ? customPrimary() : customSecondary();
        const color = rotateKeyboardHue(current, event.key.toLowerCase() === "e" ? (event.shiftKey ? 2 : 8) : (event.shiftKey ? -2 : -8));
        if (slot === "primary") setCustomPrimary(color);
        else setCustomSecondary(color);
        setActiveThemeIndex(themes.length);
        playSound("move");
      } else if (event.key === "Enter" || event.key.toLowerCase() === "x") {
        event.preventDefault();
        confirm();
      } else if (event.key === "Escape" || event.key === "Backspace" || event.key.toLowerCase() === "o") {
        event.preventDefault();
        back();
      } else if (event.key === "Home") {
        event.preventDefault();
        home();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", syncRouteFromLocation);
    window.addEventListener("pointerdown", preloadXmbSounds, { once: true });
    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", syncRouteFromLocation);
      window.removeEventListener("pointerdown", preloadXmbSounds);
    });
  });

  return (
    <main class="xmb-page">
      <XmbRuntime
        categories={categories}
        view={view()}
        activeCategory={activeCategory()}
        activeItem={activeItem()}
        activeDrillItem={activeDrillItem()}
        activeAction={activeAction()}
        drillOpen={drillOpen()}
        childOpen={childOpen()}
        detailItem={detailItem()}
        drillItems={drillItems()}
        animated={animated}
        themes={availableThemes()}
        activeTheme={activeTheme()}
        customPrimary={customPrimary()}
        customSecondary={customSecondary()}
        backgroundThemes={backgroundThemes}
        activeBackgroundTheme={activeBackgroundTheme()}
        settingsOpen={settingsOpen()}
        settingsSection={settingsSection()}
        settingsMenuIndex={settingsMenuIndex()}
        settingsColorMenuIndex={settingsColorMenuIndex()}
        tracks={musicTracks}
        activeTrack={activeTrack()}
        musicPlayerOpen={musicPlayerOpen()}
        posts={blogPosts}
        activePost={activePost()}
        blogReaderOpen={blogReaderOpen()}
        availabilityIndex={availabilityIndex()}
        bookingOpen={bookingOpen()}
        bookingUrl={bookingUrl}
        soundEnabled={soundEnabled()}
        onSoundToggle={toggleSound}
        onSoundError={() => playSound("error")}
        onViewSelect={(nextView) => {
          playSound("move");
          selectView(nextView);
        }}
        onCategorySelect={(index) => {
          playSound("move");
          selectCategory(index);
        }}
        onSettingsOpen={() => {
          playSound("confirm");
          openSettings();
        }}
        onSettingsClose={() => {
          playSound("back");
          setSettingsSection("menu");
          setSettingsOpen(false);
        }}
        onSettingsSectionChange={(section) => {
          const returningFromEditor = settingsSection().startsWith("color-") && section === "color";
          playSound(section === "menu" || returningFromEditor ? "back" : "confirm");
          setSettingsSection(section);
        }}
        onSettingsMenuSelect={(index) => {
          playSound("move");
          setSettingsMenuIndex(index);
        }}
        onSettingsColorMenuSelect={(index) => {
          if (index === settingsColorMenuIndex()) return;
          playSound("move");
          setSettingsColorMenuIndex(index);
        }}
        onThemeSelect={(index) => {
          playSound("move");
          setActiveThemeIndex(index);
        }}
        onCustomColorChange={(slot, color) => {
          if (slot === "primary") setCustomPrimary(validHexColor(color, customPrimary()));
          else setCustomSecondary(validHexColor(color, customSecondary()));
          setActiveThemeIndex(themes.length);
        }}
        onBackgroundThemeSelect={(index) => {
          playSound("move");
          setActiveBackgroundThemeIndex(index);
        }}
        onItemSelect={(index) => {
          playSound("move");
          setActiveItem(index);
          setActiveAction(0);
        }}
        onItemActivate={(index) => {
          setActiveItem(index);
          window.setTimeout(confirm, 0);
        }}
        onDrillItemSelect={(index) => {
          playSound("move");
          setActiveDrillItem(index);
          setActiveAction(0);
        }}
        onDrillItemActivate={(index) => {
          playSound("confirm");
          setActiveDrillItem(index);
          window.setTimeout(() => setChildOpen(true), 0);
        }}
        onActionSelect={(index) => {
          playSound("move");
          setActiveAction(index);
        }}
        onTrackSelect={(index) => {
          playSound("move");
          setActiveTrack(index);
        }}
        onTrackActivate={(index) => {
          playSound("confirm");
          setActiveTrack(index);
          setMusicPlayerOpen(true);
        }}
        onMusicPlayerClose={() => {
          playSound("back");
          setMusicPlayerOpen(false);
        }}
        onPostSelect={(index) => {
          playSound("move");
          setActivePost(index);
        }}
        onPostActivate={(index) => {
          playSound("confirm");
          openBlogPost(index);
        }}
        onBlogReaderClose={() => {
          playSound("back");
          closeBlogPost();
        }}
        onAvailabilitySelect={(index) => {
          playSound("move");
          setAvailabilityIndex(index);
        }}
        onBookingOpen={() => {
          playSound("confirm");
          setBookingOpen(true);
        }}
        onBookingClose={() => {
          playSound("back");
          setBookingOpen(false);
        }}
        onBookingContinue={() => {
          playSound("confirm");
          continueBooking();
        }}
      />
    </main>
  );
}

export default App;
