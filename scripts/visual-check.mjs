import { chromium } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "artifacts", "xmb-game-acceptance");
await mkdir(outputDir, { recursive: true });

const url = process.env.CHECK_URL ?? "http://127.0.0.1:5174/";
const browserPath =
  process.env.BROWSER_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    : "/usr/bin/chromium");

const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});

const results = [];
const failures = [];
const check = (name, passed, detail = "") => {
  const result = { name, passed: Boolean(passed), detail };
  results.push(result);
  if (!passed) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

const customIconNames = ["parent-education", "child-education", "child-coursework"];
const customIconSources = await Promise.all(
  customIconNames.map((iconName) => readFile(resolve(root, "public", "psp", "icons", `${iconName}.svg`), "utf8")),
);
check(
  "assets: custom academic icons use the flat PS3 treatment",
  customIconSources.every((source) =>
    source.includes('data-icon-style="flat-bordered-ps3"') &&
    !source.includes("linearGradient") &&
    !source.includes("feDropShadow"),
  ),
);
check(
  "assets: custom academic icons contain no universal wrapper",
  customIconSources.every((source) =>
    !source.includes('cx="32" cy="32" r="28"') &&
    !source.includes('width="56" height="56"') &&
    !source.includes('rx="28"'),
  ),
);
check(
  "assets: academic icon paths have deliberate internal separation",
  customIconSources[0].includes('M14 41') && customIconSources[1].includes('M14 41') &&
    customIconSources[2].includes('M7 11h22') && customIconSources[2].includes('M39 11h22'),
);

const borderedSkillIconNames = ["typescript", "solidjs", "vite"];
const borderedSkillIconSources = await Promise.all(
  borderedSkillIconNames.map((iconName) => readFile(resolve(root, "public", "psp", "icons", `${iconName}.svg`), "utf8")),
);
check(
  "assets: TypeScript SolidJS and Vite use bordered flat silhouettes",
  borderedSkillIconSources.every((source) =>
    source.includes('data-icon-style="flat-bordered-ps3"') &&
      source.includes('stroke="#fff"') &&
      !source.includes("linearGradient") &&
      !source.includes("feDropShadow"),
  ),
);

const officialPs3IconNames = [
  "user", "settings", "search", "game", "system-settings", "friends",
  "account", "date-time", "trophy", "display-settings",
];
const officialPs3IconBuffers = await Promise.all(
  officialPs3IconNames.map((iconName) => readFile(resolve(root, "public", "psp", "icons", "ps3", `${iconName}.png`))),
);
check(
  "assets: official PS3 icons are valid transparent 128px PNGs",
  officialPs3IconBuffers.every((buffer) =>
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    buffer.readUInt32BE(16) === 128 && buffer.readUInt32BE(20) === 128,
  ),
);
const officialPs3Source = await readFile(resolve(root, "public", "psp", "icons", "ps3", "SOURCE.txt"), "utf8");
check(
  "assets: official PS3 icon source is documented",
  officialPs3Source.includes("color-icon-pack-9-themes.html") && officialPs3Source.includes("2848-WHITE.p3t"),
);

async function visit(name, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  const failedResponses = [];
  const shellRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/psp/shell/")) shellRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(url).origin) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);

  const screen = page.locator(".xmb-screen");
  await screen.waitFor({ state: "visible" });
  const fullScreenGeometry = await screen.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  check(
    `${name}: XMB fills viewport`,
    Math.abs(fullScreenGeometry.x) < 1 &&
      Math.abs(fullScreenGeometry.y) < 1 &&
      Math.abs(fullScreenGeometry.width - fullScreenGeometry.viewportWidth) < 1 &&
      Math.abs(fullScreenGeometry.height - fullScreenGeometry.viewportHeight) < 1,
    JSON.stringify(fullScreenGeometry),
  );
  check(`${name}: no outer PSP DOM`, (await page.locator('[class*="psp-"]').count()) === 0);
  check(`${name}: no shell asset requests`, shellRequests.length === 0, shellRequests.join(" | "));
  check(`${name}: preview deck removed`, (await page.locator(".xmb-project-preview").count()) === 0);

  const fontState = await screen.evaluate(async (element) => {
    const faces = await document.fonts.load('400 16px "M PLUS 1p"', "Game Project Library");
    return {
      family: getComputedStyle(element).fontFamily,
      loaded: faces.length > 0 && document.fonts.check('400 16px "M PLUS 1p"', "Game Project Library"),
    };
  });
  check(
    `${name}: New Rodin reference fallback loaded`,
    fontState.family.includes("M PLUS 1p") && fontState.loaded,
    JSON.stringify(fontState),
  );

  const categories = page.locator(".xmb-category");
  check(`${name}: eight XMB categories including Media and Blog`, (await categories.count()) === 8, `count=${await categories.count()}`);
  const categoryIcons = await page.locator(".xmb-category img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute("src"),
      loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
    })),
  );
  check(
    `${name}: category icons loaded`,
    categoryIcons.length === 8 && categoryIcons.every((icon) => icon.loaded),
    JSON.stringify(categoryIcons),
  );
  check(
    `${name}: parent categories use semantic official PS3 icons where available`,
    JSON.stringify(categoryIcons.map((icon) => icon.src)) === JSON.stringify([
      "/psp/icons/ps3/user.png",
      "/psp/icons/parent-education.svg",
      "/psp/icons/ps3/settings.png",
      "/psp/icons/ps3/game.png",
      "/psp/icons/ps3/system-settings.png",
      "/psp/icons/ps3/friends.png",
      "/psp/icons/music.svg",
      "/psp/icons/document.svg",
    ]),
    JSON.stringify(categoryIcons),
  );
  const categoryContrast = await page.locator(".xmb-category").evaluateAll((nodes) => nodes.map((node) => ({
    active: node.classList.contains("is-active"),
    opacity: Number.parseFloat(getComputedStyle(node.querySelector("img")).opacity),
  })));
  check(
    `${name}: selected parent is bright and inactive parents are strongly dimmed`,
    categoryContrast.filter((item) => item.active).every((item) => item.opacity >= 0.99) &&
      categoryContrast.filter((item) => !item.active).every((item) => item.opacity <= 0.5),
    JSON.stringify(categoryContrast),
  );
  const renderedIconFilters = await page.locator(".xmb-category img, .xmb-item-icon, .xmb-system-action img").evaluateAll(
    (images) => images.map((image) => getComputedStyle(image).filter),
  );
  check(
    `${name}: visible XMB icons share one flat monochrome filter`,
    renderedIconFilters.every((filter) => filter !== "none" && filter.includes("invert(1)")),
    JSON.stringify(renderedIconFilters),
  );
  check(`${name}: quick-menu dropdown is absent`,
    (await page.locator(".xmb-quick-menu, .xmb-quick-menu-trigger, .xmb-quick-menu-backdrop").count()) === 0 &&
    (await screen.getAttribute("data-quick-menu-open")) === null,
  );
  check(`${name}: flat system navigation is visible`, await page.locator(".xmb-system-nav").isVisible());
  check(
    `${name}: Media is part of the main XMB category bar`,
    (await page.locator('.xmb-category[aria-label="Media"]').count()) === 1 &&
      (await page.locator(".xmb-system-sections").count()) === 0,
  );
  check(
    `${name}: Blog is part of the main XMB category bar`,
    (await page.locator('.xmb-category[aria-label="Blog"]').count()) === 1,
  );
  check(
    `${name}: Theme Settings is restored to the upper-right system navigation`,
    (await page.locator('.xmb-category[aria-label="Theme"]').count()) === 0 &&
      (await page.locator('.xmb-system-action[aria-label="Settings"]').count()) === 1,
  );
  const keyboardHints = await page.locator(".xmb-footer-hints").evaluate((footer) => ({
    keys: [...footer.querySelectorAll("kbd")].map((key) => key.textContent?.trim()),
    text: footer.textContent,
  }));
  check(`${name}: XMB control hints use keyboard keys instead of PlayStation buttons`,
    keyboardHints.keys.includes("Esc") && keyboardHints.keys.includes("Enter") &&
      !keyboardHints.text?.includes("○") && !keyboardHints.text?.includes("×"),
    JSON.stringify(keyboardHints),
  );
  const systemActionIcons = await page.locator(".xmb-system-action img").evaluateAll((images) => images.map((image) => ({
    src: image.getAttribute("src"),
    loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth === 128,
  })));
  check(
    `${name}: right navigation uses official Search Settings and User icons`,
    JSON.stringify(systemActionIcons.map((icon) => icon.src)) === JSON.stringify([
      "/psp/icons/ps3/search.png",
      "/psp/icons/ps3/settings.png",
      "/psp/icons/ps3/user.png",
    ]) && systemActionIcons.every((icon) => icon.loaded),
    JSON.stringify(systemActionIcons),
  );
  check(`${name}: Search is present without opening a panel`,
    (await page.locator('.xmb-system-action[aria-label="Search"]').getAttribute("aria-disabled")) === "true",
  );
  const soundToggle = page.locator(".xmb-sound-toggle");
  check(`${name}: menu sound toggle starts enabled`,
    await soundToggle.isVisible() && (await soundToggle.getAttribute("aria-pressed")) === "true",
  );
  await page.keyboard.press("Control+m");
  check(`${name}: Ctrl plus M mutes and persists menu sounds`,
    (await soundToggle.getAttribute("aria-pressed")) === "false" &&
      (await page.evaluate(() => localStorage.getItem("nisan-xmb-sound"))) === "off",
  );
  await page.keyboard.press("Control+m");
  check(`${name}: Ctrl plus M restores menu sounds`,
    (await soundToggle.getAttribute("aria-pressed")) === "true" &&
      (await page.evaluate(() => localStorage.getItem("nisan-xmb-sound"))) === "on",
  );
  const clockText = (await page.locator(".xmb-clock").textContent())?.trim() ?? "";
  check(`${name}: clock uses strict HH:MM format`, /^\d{2}:\d{2}$/.test(clockText), clockText);
  const navGeometry = await page.locator(".xmb-system-nav").evaluate((nav) => {
    const rect = nav.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth };
  });
  check(
    `${name}: system navigation stays inside viewport`,
    navGeometry.left >= 0 && navGeometry.right <= navGeometry.viewportWidth + 1 && navGeometry.top >= 0,
    JSON.stringify(navGeometry),
  );
  check(
    `${name}: profile starts active`,
    (await page.locator(".xmb-category.is-active").getAttribute("aria-label")) === "Profile",
  );
  const profileIcons = await page.locator(".xmb-item-icon").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  check(
    `${name}: Profile children use detail-specific icons`,
    JSON.stringify(profileIcons) === JSON.stringify([
      "/psp/icons/ps3/account.png",
      "/psp/icons/ps3/user.png",
      "/psp/icons/ps3/date-time.png",
    ]),
    JSON.stringify(profileIcons),
  );

  await page.locator('[data-item-id="about"]').click();
  await page.waitForTimeout(120);
  await page.locator('[data-item-id="about"]').click();
  await page.waitForTimeout(240);
  check(`${name}: About opens a structured timeline`,
    (await page.locator(".xmb-profile-timeline li").count()) === 3 &&
    (await page.locator(".xmb-profile-timeline").textContent())?.includes("Flushing, New York City") &&
    (await page.locator(".xmb-profile-timeline").textContent())?.includes("Software engineering"),
  );
  const oceanChildPanel = await page.locator(".xmb-child-panel-inner").evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    return { background: getComputedStyle(panel).backgroundImage, width: rect.width };
  });
  check(`${name}: child sidebar uses compact PSP width`,
    name === "mobile" ? oceanChildPanel.width <= viewport.width : oceanChildPanel.width <= 650,
    JSON.stringify(oceanChildPanel),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-about-timeline.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(160);

  await page.locator('[data-item-id="availability"]').click();
  await page.waitForTimeout(120);
  await page.locator('[data-item-id="availability"]').click();
  await page.waitForTimeout(240);
  check(`${name}: Availability shows three selectable schedule cards`,
    (await page.locator(".xmb-availability-grid button").count()) === 3 &&
    (await page.locator(".xmb-availability-grid button.is-active").count()) === 1,
  );
  check(`${name}: Availability uses supplied location and open-to-work status`,
    (await page.locator(".xmb-availability").textContent())?.includes("Flushing, New York City") &&
    (await page.locator(".xmb-availability").textContent())?.includes("Currently open to work"),
  );
  await page.locator(".xmb-book-button").click();
  await page.waitForTimeout(180);
  check(`${name}: booking popup opens with availability choices`,
    (await screen.getAttribute("data-booking-open")) === "true" &&
    (await page.locator(".booking-options button").count()) === 3,
  );
  check(`${name}: booking provider is not fabricated when URL is missing`,
    await page.locator(".booking-card > footer button").isDisabled(),
  );
  const bookingGeometry = await page.locator(".booking-card").evaluate((card) => {
    const rect = card.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  check(`${name}: booking card remains inside viewport`,
    bookingGeometry.left >= 0 && bookingGeometry.right <= bookingGeometry.viewportWidth + 1 &&
      bookingGeometry.top >= 0 && bookingGeometry.bottom <= bookingGeometry.viewportHeight + 1,
    JSON.stringify(bookingGeometry),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-booking-modal.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  check(`${name}: Escape closes booking before the detail panel`,
    (await screen.getAttribute("data-booking-open")) === "false" &&
    (await screen.getAttribute("data-child-open")) === "true",
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(160);

  await page.locator('.xmb-category[aria-label="Education"]').click();
  await page.waitForTimeout(180);
  const educationIcons = await page.locator(".xmb-item-icon").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  check(
    `${name}: Education children use academic icons`,
    JSON.stringify(educationIcons) === JSON.stringify([
      "/psp/icons/child-education.svg",
      "/psp/icons/child-coursework.svg",
      "/psp/icons/ps3/trophy.png",
    ]),
    JSON.stringify(educationIcons),
  );
  await page.locator('[data-item-id="education-history"]').click();
  await page.waitForTimeout(220);
  check(`${name}: Education opens a timeline-style verified-data state`,
    await page.locator(".xmb-history-panel").isVisible() &&
    (await page.locator(".xmb-history-panel").textContent())?.includes("Verified record required"),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-education-history.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(140);
  await page.locator('.xmb-category[aria-label="Profile"]').click();
  await page.waitForTimeout(180);

  const wave = page.locator("canvas.xmb-shader");
  const framesBefore = await wave.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  await page.waitForTimeout(350);
  const framesAfter = await wave.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  check(`${name}: shader advances`, framesAfter > framesBefore, `${framesBefore} -> ${framesAfter}`);

  if (name === "desktop") {
    await page.screenshot({ path: resolve(outputDir, "desktop-base.png"), fullPage: true });
  }

  await page.screenshot({
    path: resolve(outputDir, name === "desktop" ? "desktop-top-nav.png" : "mobile-top-nav.png"),
    fullPage: true,
  });
  check(`${name}: Profile starts as the active XMB category`,
    (await page.locator(".xmb-category.is-active").getAttribute("aria-label")) === "Profile",
  );

  await page.keyboard.press("Control+ArrowUp");
  await page.waitForTimeout(220);
  check(
    `${name}: Ctrl plus Up opens the XMB theme panel`,
    (await screen.getAttribute("data-settings-open")) === "true" &&
      await page.locator(".xmb-theme-panel").isVisible() &&
      (await page.locator('.xmb-system-action[aria-label="Settings"]').getAttribute("aria-expanded")) === "true",
  );
  check(`${name}: Theme and Color are separate settings`,
    (await page.locator('.xmb-theme-menu-item:has-text("Theme")').count()) === 1 &&
      (await page.locator('.xmb-theme-menu-item:has-text("Color")').count()) === 1 &&
      (await page.locator(".xmb-theme-swatch").count()) === 0,
  );
  await page.locator('.xmb-theme-menu-item:has-text("Theme")').click();
  const themeOptionCount = await page.locator(".xmb-background-theme-option").count();
  check(`${name}: Theme opens background themes rather than colors`,
    themeOptionCount >= 4 &&
      (await page.locator("canvas.xmb-theme-preview-canvas").count()) === themeOptionCount &&
      (await page.locator(".xmb-theme-swatch").count()) === 0,
  );
  const transparentThemePanel = await page.locator(".xmb-theme-panel-inner").evaluate((panel) => ({
    backdropFilter: getComputedStyle(panel).backdropFilter,
    background: getComputedStyle(panel).backgroundImage,
  }));
  check(`${name}: Theme Settings uses translucent XMB glass`,
    transparentThemePanel.backdropFilter.includes("blur") && transparentThemePanel.background.includes("rgba"),
    JSON.stringify(transparentThemePanel),
  );
  await page.locator('.xmb-background-theme-option[aria-label="Liquid Flow"]').click();
  await page.waitForTimeout(180);
  const flowCanvas = page.locator("canvas.xmb-shader-theme");
  const flowFramesBefore = await flowCanvas.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  await page.waitForTimeout(350);
  const flowFramesAfter = await flowCanvas.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  check(`${name}: selecting a background theme updates and persists it independently`,
    (await screen.getAttribute("data-theme")) === "liquid-flow" &&
      (await screen.getAttribute("data-color")) === "ocean" &&
      await flowCanvas.isVisible() &&
      (await page.evaluate(() => localStorage.getItem("nisan-xmb-background-theme"))) === "liquid-flow",
  );
  check(`${name}: Liquid Flow is a real animated canvas theme`,
    flowFramesAfter > flowFramesBefore,
    `${flowFramesBefore} -> ${flowFramesAfter}`,
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-emerald-violet-theme.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.locator('.xmb-theme-menu-item:has-text("Color")').click();
  await page.locator('.xmb-theme-swatch[aria-label="April"]').click();
  await page.waitForTimeout(180);
  check(`${name}: Color also recolors the selected Liquid Flow theme`,
    (await screen.getAttribute("data-theme")) === "liquid-flow" &&
      (await screen.getAttribute("data-color")) === "april" &&
      await flowCanvas.isVisible(),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-liquid-flow-april.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.locator('.xmb-theme-menu-item:has-text("Theme")').click();
  await page.locator('.xmb-background-theme-option[aria-label="PS2 Menu"]').click();
  await page.waitForTimeout(220);
  const ps2Canvas = page.locator("canvas.xmb-shader-theme");
  const ps2FramesBefore = await ps2Canvas.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  await page.waitForTimeout(300);
  const ps2FramesAfter = await ps2Canvas.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  check(`${name}: dropped PS2 Menu shader auto-registers and animates`,
    (await screen.getAttribute("data-theme")) === "ps2-menu" && ps2FramesAfter > ps2FramesBefore,
    `${ps2FramesBefore} -> ${ps2FramesAfter}`,
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-ps2-menu-theme.png`), fullPage: true });
  await page.locator('.xmb-background-theme-option[aria-label="PS3"]').click();
  await page.waitForTimeout(700);
  const ps3Canvas = page.locator("canvas.xmb-shader-theme");
  const ps3Render = await ps3Canvas.evaluate((canvas) => {
    const gl = canvas.getContext("webgl");
    if (!gl) return { brightest: 0, frames: canvas.__xmbFrames ?? 0 };
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let brightest = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      brightest = Math.max(brightest, pixels[index], pixels[index + 1], pixels[index + 2]);
    }
    return { brightest, frames: canvas.__xmbFrames ?? 0 };
  });
  check(`${name}: PS3 shader compiles and renders its animated wave`,
    (await screen.getAttribute("data-theme")) === "ps3" &&
      (await ps3Canvas.getAttribute("data-shader-error")) === null &&
      ps3Render.frames > 1 && ps3Render.brightest > 24,
    JSON.stringify(ps3Render),
  );
  check(`${name}: PS3 shader keeps XMB Color Settings unlocked`,
    !(await page.locator('.xmb-theme-menu-item:has-text("Color")').isDisabled()),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-ps3-theme.png`), fullPage: true });
  await page.locator('.xmb-background-theme-option[aria-label="PS2 Menu2"]').click();
  await page.waitForTimeout(220);
  const ps2MultipassCanvas = page.locator("canvas.xmb-shader-theme");
  const multipassFramesBefore = await ps2MultipassCanvas.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  await page.waitForTimeout(300);
  const multipassFramesAfter = await ps2MultipassCanvas.evaluate((canvas) => canvas.__xmbFrames ?? 0);
  check(`${name}: PS2 Menu2 groups Image Buffer A and Buffer B into a working multipass theme`,
    (await screen.getAttribute("data-theme")) === "ps2-menu2" &&
      (await ps2MultipassCanvas.getAttribute("data-shader-error")) === null &&
      multipassFramesAfter > multipassFramesBefore,
    `${multipassFramesBefore} -> ${multipassFramesAfter}`,
  );
  check(`${name}: themes without XMB color uniforms lock the Color menu`,
    (await page.locator('.xmb-theme-menu-item:has-text("Color")').isDisabled()) &&
      (await page.locator('.xmb-theme-menu-item:has-text("Color") b').textContent())?.trim() === "Locked",
  );
  const lockedChrome = await screen.evaluate((element) => {
    const value = getComputedStyle(element).getPropertyValue("--theme-accent").trim();
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
    return {
      mode: element.getAttribute("data-theme-chrome"),
      channels: match ? match.slice(1).map((channel) => Number.parseInt(channel, 16)) : [],
    };
  });
  check(`${name}: color-locked theme samples its own color for the XMB chrome`,
    lockedChrome.mode === "sampled" &&
      lockedChrome.channels.length === 3 &&
      lockedChrome.channels[2] > lockedChrome.channels[1] &&
      lockedChrome.channels[2] > lockedChrome.channels[0],
    JSON.stringify(lockedChrome),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-ps2-menu2-theme.png`), fullPage: true });
  await page.locator('.xmb-background-theme-option[aria-label="Xbox Background"]').click();
  await page.waitForTimeout(500);
  const xboxCanvas = page.locator("canvas.xmb-shader-theme");
  const xboxRender = await xboxCanvas.evaluate((canvas) => {
    const gl = canvas.getContext("webgl");
    if (!gl) return { brightest: 0, frames: canvas.__xmbFrames ?? 0 };
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let brightest = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      brightest = Math.max(brightest, pixels[index], pixels[index + 1], pixels[index + 2]);
    }
    return { brightest, frames: canvas.__xmbFrames ?? 0 };
  });
  check(`${name}: Xbox Background compiles and renders visible shader pixels`,
    (await screen.getAttribute("data-theme")) === "xbox-background" &&
      (await xboxCanvas.getAttribute("data-shader-error")) === null &&
      xboxRender.frames > 1 && xboxRender.brightest > 8,
    JSON.stringify(xboxRender),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-xbox-background-theme.png`), fullPage: true });
  await page.locator('.xmb-background-theme-option[aria-label="Underwater"]').click();
  await page.waitForTimeout(900);
  const underwaterCanvas = page.locator("canvas.xmb-shader-theme");
  const underwaterRender = await underwaterCanvas.evaluate((canvas) => {
    const gl = canvas.getContext("webgl");
    if (!gl) return { brightest: 0, frames: canvas.__xmbFrames ?? 0 };
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let brightest = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      brightest = Math.max(brightest, pixels[index], pixels[index + 1], pixels[index + 2]);
    }
    return { brightest, frames: canvas.__xmbFrames ?? 0 };
  });
  check(`${name}: Underwater compiles and renders its animated ocean scene`,
    (await screen.getAttribute("data-theme")) === "underwater" &&
      (await underwaterCanvas.getAttribute("data-shader-error")) === null &&
      underwaterRender.frames > 1 && underwaterRender.brightest > 24,
    JSON.stringify(underwaterRender),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-underwater-theme.png`), fullPage: true });
  await page.locator('.xmb-background-theme-option[aria-label="Original"]').click();
  await page.keyboard.press("Escape");
  await page.locator('.xmb-theme-menu-item:has-text("Color")').click();
  check(`${name}: Color exposes presets plus primary and secondary custom menus`,
    (await page.locator(".xmb-theme-swatch").count()) === 14 &&
      (await page.locator('.xmb-theme-swatch[aria-label="Ocean"]').count()) === 1 &&
      (await page.locator('.xmb-theme-swatch[aria-label="Custom"]').count()) === 1 &&
      (await page.locator('.xmb-custom-color-controls button').count()) === 2 &&
      (await page.locator('input[type="color"]').count()) === 0,
  );
  const colorsBeforeKeyboardEdit = await page.evaluate(() => ({
    primary: localStorage.getItem("nisan-xmb-custom-primary"),
    secondary: localStorage.getItem("nisan-xmb-custom-secondary"),
  }));
  await page.locator('.xmb-custom-color-controls button:has-text("Primary")').click();
  check(`${name}: Primary opens the component color editor`,
    (await page.locator('.xmb-theme-panel-body').getAttribute("data-section")) === "color-primary" &&
      (await page.locator('.xmb-keyboard-color-picker[aria-label="Primary color picker"]').count()) === 1,
  );
  await page.keyboard.press("e");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await page.locator('.xmb-custom-color-controls button:has-text("Secondary")').click();
  await page.keyboard.press("q");
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(120);
  const customPalette = await screen.evaluate((element) => ({
    color: element.getAttribute("data-color"),
    primary: getComputedStyle(element).getPropertyValue("--theme-panel-mid").trim(),
    secondary: getComputedStyle(element).getPropertyValue("--theme-panel-light").trim(),
  }));
  const colorsAfterKeyboardEdit = await page.evaluate(() => ({
    primary: localStorage.getItem("nisan-xmb-custom-primary"),
    secondary: localStorage.getItem("nisan-xmb-custom-secondary"),
  }));
  check(`${name}: keyboard color editors immediately apply and persist both palette colors`,
    customPalette.color === "custom" &&
      colorsAfterKeyboardEdit.primary !== colorsBeforeKeyboardEdit.primary &&
      colorsAfterKeyboardEdit.secondary !== colorsBeforeKeyboardEdit.secondary &&
      customPalette.primary === colorsAfterKeyboardEdit.primary &&
      customPalette.secondary === colorsAfterKeyboardEdit.secondary,
    JSON.stringify(customPalette),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-custom-color-picker.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.locator('.xmb-theme-swatch[aria-label="April"]').click();
  await page.waitForTimeout(180);
  check(`${name}: selecting a color updates and persists the live palette`,
    (await screen.getAttribute("data-theme")) === "original" &&
      (await screen.getAttribute("data-color")) === "april" &&
      (await page.evaluate(() => localStorage.getItem("nisan-xmb-theme"))) === "april",
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-theme-settings.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(140);
  await page.locator('[data-item-id="about"]').click();
  await page.waitForTimeout(80);
  await page.locator('[data-item-id="about"]').click();
  await page.waitForTimeout(180);
  const aprilChildBackground = await page.locator(".xmb-child-panel-inner").evaluate((panel) => getComputedStyle(panel).backgroundImage);
  const aprilChildBackdrop = await page.locator(".xmb-child-panel-inner").evaluate((panel) => getComputedStyle(panel).backdropFilter);
  check(`${name}: selected color recolors the child sidebar`,
    aprilChildBackground !== oceanChildPanel.background,
    `${oceanChildPanel.background} -> ${aprilChildBackground}`,
  );
  check(`${name}: detail sidebar keeps the animated theme visible through XMB glass`,
    aprilChildBackdrop.includes("blur"),
    aprilChildBackdrop,
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-april-child-panel.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.locator('.xmb-system-action[aria-label="Settings"]').click();
  await page.waitForTimeout(100);
  await page.locator('.xmb-theme-menu-item:has-text("Color")').click();
  await page.locator('.xmb-theme-swatch[aria-label="Ocean"]').click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(160);
  check(`${name}: Escape closes Theme Settings`, (await screen.getAttribute("data-settings-open")) === "false");

  await page.locator('.xmb-system-action[aria-label="Profile"]').click();
  await page.waitForTimeout(140);
  check(
    `${name}: Profile icon returns to Profile`,
    (await page.locator(".xmb-category.is-active").getAttribute("aria-label")) === "Profile",
  );
  await page.keyboard.press("m");
  check(
    `${name}: Search and M do not open a dropdown`,
    (await page.locator(".xmb-quick-menu, .xmb-quick-menu-backdrop").count()) === 0 &&
      (await screen.getAttribute("data-quick-menu-open")) === null,
  );

  await page.locator('.xmb-category[aria-label="Media"]').click();
  await page.waitForTimeout(240);
  check(`${name}: Media opens a dedicated music mode`,
      (await screen.getAttribute("data-view")) === "media" &&
      (await page.locator(".xmb-music-item").count()) === 4 &&
      (await page.locator(".xmb-category").count()) === 8,
  );
  const mediaNavigation = await page.locator(".xmb-category.is-active").evaluate((category) => ({
    icon: category.querySelector("img")?.getAttribute("src"),
    label: category.textContent?.trim(),
  }));
  const musicRailWidth = await page.locator(".xmb-music-item.is-active").evaluate((item) => item.getBoundingClientRect().width);
  check(`${name}: Music occupies an XMB navigation category`,
    mediaNavigation.icon === "/psp/icons/music.svg" && mediaNavigation.label === "Media",
    JSON.stringify(mediaNavigation),
  );
  check(`${name}: music child rail remains compact`,
    name === "mobile" ? musicRailWidth <= 230 : musicRailWidth <= 350,
    String(musicRailWidth),
  );
  const trackState = await page.locator(".xmb-music-item").evaluateAll((items) => items.map((item) => {
    const image = item.querySelector("img");
    return {
      title: item.querySelector("strong")?.textContent?.trim(),
      artist: item.querySelector("span")?.textContent?.trim(),
      artwork: image?.getAttribute("src"),
      loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
    };
  }));
  check(`${name}: music rows contain supplied title artist and local artwork`,
    trackState[0]?.title === "A New Kind Of Love" && trackState[0]?.artist === "SEREN" &&
      trackState.every((track) => track.loaded && track.artwork?.startsWith("/media/tracks/")),
    JSON.stringify(trackState),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-music-library.png`), fullPage: true });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(260);
  check(`${name}: music player opens with coverflow and visualizer`,
    (await page.locator(".xmb-music-player").getAttribute("data-open")) === "true" &&
      (await page.locator(".xmb-coverflow > span").count()) === 4 &&
      (await page.locator(".xmb-music-visualizer > span").count()) === 18,
  );
  const playerCoversSystemNav = await page.locator(".xmb-system-nav").evaluate((nav) => {
    const rect = nav.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(top?.closest(".xmb-music-player"));
  });
  check(`${name}: open music player covers the underlying system navigation`, playerCoversSystemNav);
  check(`${name}: verified first-track playback source is user initiated`,
    (await page.locator(".xmb-music-play").getAttribute("data-playback-url"))?.includes("zDsnUcdspLw"),
  );
  const playerGeometry = await page.locator(".xmb-music-player").evaluate((player) => {
    const bounds = player.getBoundingClientRect();
    const play = player.querySelector(".xmb-music-play")?.getBoundingClientRect();
    const topbar = player.querySelector(".xmb-music-player-topbar")?.getBoundingClientRect();
    const close = player.querySelector(".xmb-music-player-topbar button")?.getBoundingClientRect();
    const kind = player.querySelector(".xmb-music-player-kind")?.getBoundingClientRect();
    const footer = player.querySelector(".xmb-music-player-footer")?.getBoundingClientRect();
    return play && topbar && close && kind && footer ? {
      accent: player.getAttribute("data-track-accent"),
      playCenterDelta: Math.abs((play.left + play.width / 2) - (bounds.left + bounds.width / 2)),
      closeCenterDelta: Math.abs((close.top + close.height / 2) - (kind.top + kind.height / 2)),
      leftGutterDelta: Math.abs(topbar.left - footer.left),
      rightGutterDelta: Math.abs(topbar.right - footer.right),
    } : null;
  });
  check(`${name}: player uses album accent and centered transport`,
    Boolean(playerGeometry && playerGeometry.accent === "#806090" && playerGeometry.playCenterDelta < 1),
    JSON.stringify(playerGeometry),
  );
  check(`${name}: close control and progress bar share player alignment grid`,
    Boolean(playerGeometry && playerGeometry.closeCenterDelta < 1.5 && playerGeometry.leftGutterDelta <= 4 && playerGeometry.rightGutterDelta <= 4),
    JSON.stringify(playerGeometry),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-music-player.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  check(`${name}: Escape closes player before leaving Media`,
    (await page.locator(".xmb-music-player").getAttribute("data-open")) === "false" &&
      (await screen.getAttribute("data-view")) === "media",
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(160);
  check(`${name}: second Escape returns to Portfolio`, (await screen.getAttribute("data-view")) === "portfolio");

  await page.locator('.xmb-category[aria-label="Blog"]').click();
  await page.waitForTimeout(240);
  check(`${name}: Blog opens at its own URL with standard XMB rows`,
    (await screen.getAttribute("data-view")) === "blog" &&
      new URL(page.url()).pathname === "/blog" &&
      (await page.locator(".xmb-blog-items .xmb-item").count()) === 4 &&
      (await page.locator(".xmb-blog-items .xmb-item.is-active .xmb-item-label").textContent())?.trim() === "Building an XMB in the Browser",
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-blog-list.png`), fullPage: true });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(280);
  check(`${name}: Blog reader opens the keyboard-selected article`,
    (await screen.getAttribute("data-blog-open")) === "true" &&
      new URL(page.url()).pathname === "/blog/portable-shadertoy-themes" &&
      (await page.locator(".xmb-blog-article h1").textContent())?.trim() === "Making Shadertoy Themes Portable" &&
      (await page.locator(".xmb-markdown h2").count()) === 4 &&
      (await page.locator(".xmb-markdown pre").count()) === 2 &&
      (await page.locator(".xmb-blog-toc a").count()) === 4,
  );
  const highlightedCode = page.locator(".xmb-markdown pre code.hljs");
  check(`${name}: fenced Markdown code receives syntax highlighting`,
    (await highlightedCode.count()) === 2 &&
      (await highlightedCode.locator(".hljs-keyword, .hljs-built_in, .hljs-string, .hljs-title").count()) > 0,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(220);
  check(`${name}: Blog article URL loads directly with the same XMB UI`,
    (await screen.getAttribute("data-view")) === "blog" &&
      (await screen.getAttribute("data-blog-open")) === "true" &&
      new URL(page.url()).pathname === "/blog/portable-shadertoy-themes" &&
      (await page.locator('.xmb-category.is-active[aria-label="Blog"]').count()) === 1,
  );
  const ps3BlogChrome = await page.locator(".xmb-blog-article").evaluate((article) => ({
    backIcon: article.querySelector(".xmb-blog-article-back img")?.getAttribute("src"),
    categoryIcon: article.querySelector(".xmb-blog-article-kicker img")?.getAttribute("src"),
    counter: article.querySelector(".xmb-blog-article-count")?.textContent?.trim(),
    hint: article.querySelector(".xmb-blog-article-hint")?.textContent?.trim(),
    backdrop: getComputedStyle(article).backdropFilter,
  }));
  check(`${name}: Article reader uses PS3 XMB chrome over the live theme`,
    ps3BlogChrome.backIcon === "/psp/icons/arrow.svg" &&
      ps3BlogChrome.categoryIcon === "/psp/icons/document.svg" &&
      ps3BlogChrome.counter === "03 / 04" &&
      ps3BlogChrome.hint?.includes("Esc Back") && ps3BlogChrome.hint?.includes("Scroll") &&
      ps3BlogChrome.backdrop.includes("blur"),
    JSON.stringify(ps3BlogChrome),
  );
  const blogReaderGeometry = await page.locator(".xmb-blog-article").evaluate((reader) => {
    const bounds = reader.getBoundingClientRect();
    const style = getComputedStyle(reader);
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      width: bounds.width,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      background: style.backgroundImage,
    };
  });
  check(`${name}: Markdown article fills the viewport with the dark editorial surface`,
    blogReaderGeometry.left >= -1 &&
      blogReaderGeometry.right <= blogReaderGeometry.viewportWidth + 1 &&
      blogReaderGeometry.top >= -1 && blogReaderGeometry.bottom >= blogReaderGeometry.viewportHeight - 1 &&
      blogReaderGeometry.width > 0 && blogReaderGeometry.background !== "none",
    JSON.stringify(blogReaderGeometry),
  );
  const blogChromeGeometry = () => page.locator(".xmb-blog-article").evaluate((article) => {
    const position = (selector) => {
      const bounds = article.querySelector(selector)?.getBoundingClientRect();
      return bounds ? { x: bounds.x, y: bounds.y } : null;
    };
    return {
      back: position(".xmb-blog-article-back"),
      count: position(".xmb-blog-article-count"),
      hint: position(".xmb-blog-article-hint"),
    };
  });
  const chromeBeforeScroll = await blogChromeGeometry();
  const blogScroller = page.locator(".xmb-blog-article-scroll");
  await blogScroller.evaluate((scroller) => { scroller.scrollTop = 0; });
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(380);
  const downScroll = await blogScroller.evaluate((scroller) => scroller.scrollTop);
  const chromeAfterScroll = await blogChromeGeometry();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(380);
  const upScroll = await blogScroller.evaluate((scroller) => scroller.scrollTop);
  const controlsStayedFixed = ["back", "count", "hint"].every((key) => {
    const before = chromeBeforeScroll[key];
    const after = chromeAfterScroll[key];
    return before && after && Math.abs(before.x - after.x) < 1 && Math.abs(before.y - after.y) < 1;
  });
  check(`${name}: article arrow keys scroll while its controls stay fixed`,
    downScroll > 40 && upScroll < downScroll && controlsStayedFixed,
    JSON.stringify({ downScroll, upScroll, chromeBeforeScroll, chromeAfterScroll }),
  );
  await page.screenshot({ path: resolve(outputDir, `${name}-blog-reader.png`), fullPage: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  check(`${name}: Escape closes the article before leaving Blog`,
    (await screen.getAttribute("data-blog-open")) === "false" &&
      (await screen.getAttribute("data-view")) === "blog" &&
      new URL(page.url()).pathname === "/blog",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(180);
  check(`${name}: Blog numbering runs oldest 01 through latest 04`,
    new URL(page.url()).pathname === "/blog/test" &&
      (await page.locator(".xmb-blog-article-count").textContent())?.trim() === "01 / 04",
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(120);
  check(`${name}: Blog sits beside Media in horizontal XMB navigation`,
    (await screen.getAttribute("data-view")) === "media" &&
      (await page.locator('.xmb-category.is-active[aria-label="Media"]').count()) === 1,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);

  await page.locator('.xmb-category[aria-label="Projects"]').click();
  await page.waitForTimeout(240);
  check(
    `${name}: Projects remains a Portfolio category`,
    (await page.locator(".xmb-category.is-active").getAttribute("aria-label")) === "Projects",
  );
  check(
    `${name}: Projects uses official PS3 game icon`,
    (await page.locator(".xmb-category.is-active img").getAttribute("src")) === "/psp/icons/ps3/game.png",
  );
  check(
    `${name}: Project Library folder is active`,
    (await page.locator(".xmb-item.is-active .xmb-item-label").textContent())?.trim() === "Project Library",
  );
  check(`${name}: artwork hidden before folder opens`, (await page.locator(".xmb-game-art").count()) === 0);

  if (name === "desktop") {
    await page.screenshot({ path: resolve(outputDir, "desktop-game-folder.png"), fullPage: true });
    await page.keyboard.press("Enter");
  } else {
    await page.locator(".xmb-item.is-active").click();
  }
  await page.waitForTimeout(300);
  await page.locator(".xmb-items").evaluate(async (element) => {
    const animations = element.getAnimations({ subtree: true });
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });

  check(`${name}: folder opens drill level`, (await screen.getAttribute("data-drill-open")) === "true");
  check(`${name}: detail remains closed after folder opens`, (await screen.getAttribute("data-child-open")) === "false");
  check(`${name}: game library visible`, await page.locator(".xmb-game-library").isVisible());
  check(`${name}: three project games`, (await page.locator(".xmb-game-entry").count()) === 3);
  check(
    `${name}: first project starts active`,
    (await page.locator(".xmb-game-entry.is-active strong").textContent())?.trim() === "Signal Room",
  );
  check(
    `${name}: completion field shown`,
    (await page.locator(".xmb-game-entry.is-active time").textContent())?.trim() === "Finished — add date",
  );

  const gameArtState = await page.locator(".xmb-game-art img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute("src"),
      loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      width: image.getBoundingClientRect().width,
      height: image.getBoundingClientRect().height,
    })),
  );
  check(
    `${name}: all game artwork loaded`,
    gameArtState.length === 3 && gameArtState.every((art) => art.loaded && art.width > 80 && art.height > 40),
    JSON.stringify(gameArtState),
  );

  const drillGeometry = () => page.evaluate(() => {
    const folder = document.querySelector(".xmb-item.is-active .xmb-item-icon-slot")?.getBoundingClientRect();
    const game = document.querySelector(".xmb-game-entry.is-active .xmb-game-art")?.getBoundingClientRect();
    const arrow = document.querySelector(".xmb-game-library-arrow")?.getBoundingClientRect();
    return folder && game && arrow ? {
      folder: { x: folder.x, y: folder.y, width: folder.width, height: folder.height },
      game: { x: game.x, y: game.y, width: game.width, height: game.height },
      arrow: { x: arrow.x, y: arrow.y, width: arrow.width, height: arrow.height },
    } : null;
  });

  const drillBefore = await drillGeometry();
  check(
    `${name}: folder points into game list`,
    Boolean(
      drillBefore &&
        drillBefore.folder.x + drillBefore.folder.width < drillBefore.arrow.x + drillBefore.arrow.width &&
        drillBefore.arrow.x < drillBefore.game.x,
    ),
    JSON.stringify(drillBefore),
  );

  await page.keyboard.press("ArrowRight");
  check(
    `${name}: horizontal category navigation locks inside folder`,
    (await page.locator(".xmb-category.is-active").getAttribute("aria-label")) === "Projects",
  );

  await page.keyboard.press("ArrowDown");
  if (drillBefore) {
    await page.waitForFunction(
      (targetY) => {
        const active = document.querySelector(".xmb-game-entry.is-active .xmb-game-art")?.getBoundingClientRect();
        return Boolean(active && Math.abs(active.y - targetY) < 1);
      },
      drillBefore.game.y,
      { timeout: 1_500 },
    );
  }
  const drillAfter = await drillGeometry();
  check(
    `${name}: down selects next project game`,
    (await page.locator(".xmb-game-entry.is-active strong").textContent())?.trim() === "Pocket Forge",
  );
  check(
    `${name}: folder anchor remains fixed while games scroll`,
    Boolean(
      drillBefore && drillAfter &&
      Math.abs(drillBefore.folder.x - drillAfter.folder.x) < 1 &&
      Math.abs(drillBefore.folder.y - drillAfter.folder.y) < 1
    ),
    `${JSON.stringify(drillBefore)} -> ${JSON.stringify(drillAfter)}`,
  );
  check(
    `${name}: active game selection point remains fixed`,
    Boolean(
      drillBefore && drillAfter &&
      Math.abs(drillBefore.game.x - drillAfter.game.x) < 1 &&
      Math.abs(drillBefore.game.y - drillAfter.game.y) < 1
    ),
    `${JSON.stringify(drillBefore)} -> ${JSON.stringify(drillAfter)}`,
  );

  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.screenshot({
    path: resolve(outputDir, name === "desktop" ? "desktop-game-library.png" : "mobile-game-library.png"),
    fullPage: true,
  });

  if (name === "desktop") await page.keyboard.press("Enter");
  else await page.locator(".xmb-game-entry.is-active").click();
  await page.waitForTimeout(280);
  check(`${name}: project opens detail level`, (await screen.getAttribute("data-child-open")) === "true");
  check(
    `${name}: selected project detail is correct`,
    (await page.locator(".xmb-child-panel-header h2").textContent())?.trim() === "Pocket Forge",
  );
  check(
    `${name}: detail retains completion field`,
    (await page.locator(".xmb-detail-date").textContent())?.trim() === "Finished — add date",
  );
  await page.screenshot({
    path: resolve(outputDir, name === "desktop" ? "desktop-game-detail.png" : "mobile-game-detail.png"),
    fullPage: true,
  });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(220);
  check(`${name}: first back closes detail`, (await screen.getAttribute("data-child-open")) === "false");
  check(`${name}: first back preserves game library`, (await screen.getAttribute("data-drill-open")) === "true");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(220);
  check(`${name}: second back closes project folder`, (await screen.getAttribute("data-drill-open")) === "false");
  check(`${name}: artwork removed after leaving folder`, (await page.locator(".xmb-game-art").count()) === 0);

  await page.locator('.xmb-category[aria-label="Experience"]').click();
  await page.waitForTimeout(260);
  const experienceLabelState = await page.locator(".xmb-category.is-active .xmb-category-label").evaluate((label) => ({
    text: label.textContent?.trim(),
    clientWidth: label.clientWidth,
    scrollWidth: label.scrollWidth,
    textOverflow: getComputedStyle(label).textOverflow,
  }));
  check(
    `${name}: Experience parent label is complete`,
    experienceLabelState.text === "Experience" &&
      experienceLabelState.scrollWidth <= experienceLabelState.clientWidth + 1 &&
      experienceLabelState.textOverflow === "clip",
    JSON.stringify(experienceLabelState),
  );
  const experienceLabels = await page.locator(".xmb-item-label").evaluateAll((labels) => labels.map((label) => label.textContent?.trim()));
  const experienceIcons = await page.locator(".xmb-item-icon").evaluateAll((images) => images.map((image) => ({
    src: image.getAttribute("src"),
    loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
  })));
  check(
    `${name}: Experience rows use human-readable labels`,
    JSON.stringify(experienceLabels) === JSON.stringify(["Most Recent Role", "Previous Role"]),
    JSON.stringify(experienceLabels),
  );
  check(
    `${name}: Experience rows use role-specific icons`,
    JSON.stringify(experienceIcons.map((item) => item.src)) ===
      JSON.stringify(["/psp/icons/ps3/settings.png", "/psp/icons/ps3/date-time.png"]) &&
      experienceIcons.every((item) => item.loaded),
    JSON.stringify(experienceIcons),
  );
  if (name === "desktop") {
    await page.screenshot({ path: resolve(outputDir, "desktop-experience-rail.png"), fullPage: true });
    await page.keyboard.press("Enter");
  } else {
    await page.locator(".xmb-item.is-active").click();
  }
  await page.waitForTimeout(260);
  check(`${name}: Experience opens structured resume detail`, await page.locator(".xmb-resume-entry").isVisible());
  const experienceDetailTitle = await page.locator(".xmb-child-panel-header h2").evaluate((title) => ({
    text: title.textContent?.trim(),
    clientWidth: title.clientWidth,
    scrollWidth: title.scrollWidth,
    textOverflow: getComputedStyle(title).textOverflow,
  }));
  check(
    `${name}: Experience detail title renders in full`,
    experienceDetailTitle.text === "Most Recent Role" &&
      experienceDetailTitle.scrollWidth <= experienceDetailTitle.clientWidth + 1 &&
      experienceDetailTitle.textOverflow === "clip",
    JSON.stringify(experienceDetailTitle),
  );
  check(
    `${name}: resume detail aligns organization location and period`,
    (await page.locator(".xmb-resume-entry > header strong").textContent())?.trim() === "Employer name" &&
      (await page.locator(".xmb-resume-entry > header .xmb-resume-location").textContent())?.trim() === "Location or remote" &&
      (await page.locator(".xmb-resume-period").textContent())?.trim() === "Start date — End date",
  );
  const resumeAlignment = await page.locator(".xmb-resume-entry").evaluate((entry) => {
    const organization = entry.querySelector("header strong")?.getBoundingClientRect();
    const locationElement = entry.querySelector(".xmb-resume-location");
    const location = locationElement?.getBoundingClientRect();
    const period = entry.querySelector(".xmb-resume-period")?.getBoundingClientRect();
    return organization && locationElement && location && period ? {
      organizationX: organization.x,
      locationX: location.x,
      organizationBottom: organization.bottom,
      periodY: period.y,
      locationTextAlign: getComputedStyle(locationElement).textAlign,
    } : null;
  });
  check(
    `${name}: resume follows company-right-location and period-below hierarchy`,
    Boolean(resumeAlignment && resumeAlignment.locationTextAlign === "right" && resumeAlignment.periodY >= resumeAlignment.organizationBottom),
    JSON.stringify(resumeAlignment),
  );
  check(`${name}: resume detail uses concise highlight rows`, (await page.locator(".xmb-resume-entry > ul li").count()) === 3);
  await page.screenshot({
    path: resolve(outputDir, name === "desktop" ? "desktop-experience-detail.png" : "mobile-experience-detail.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  await page.locator('.xmb-category[aria-label="Skills"]').click();
  await page.waitForTimeout(260);
  const skillLabels = await page.locator(".xmb-item-label").evaluateAll((labels) => labels.map((label) => label.textContent?.trim()));
  const skillIcons = await page.locator(".xmb-item-icon").evaluateAll((images) => images.map((image) => ({
    src: image.getAttribute("src"),
    loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
  })));
  check(
    `${name}: stack entries are individual XMB items`,
    JSON.stringify(skillLabels.slice(0, 3)) === JSON.stringify(["TypeScript", "SolidJS", "Vite"]),
    JSON.stringify(skillLabels),
  );
  check(
    `${name}: stack entries use hierarchy-specific PSP icons`,
    JSON.stringify(skillIcons.map((item) => item.src)) ===
      JSON.stringify([
        "/psp/icons/typescript.svg",
        "/psp/icons/solidjs.svg",
        "/psp/icons/vite.svg",
        "/psp/icons/ps3/display-settings.png",
        "/psp/icons/ps3/system-settings.png",
      ]) && skillIcons.every((item) => item.loaded),
    JSON.stringify(skillIcons),
  );
  if (name === "desktop") {
    await page.screenshot({ path: resolve(outputDir, "desktop-skills-icons.png"), fullPage: true });
  }
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(180);
  check(`${name}: SolidJS bordered icon remains distinct when active`,
    (await page.locator(".xmb-item.is-active .xmb-item-label").textContent())?.trim() === "SolidJS",
  );
  if (name === "desktop") {
    await page.screenshot({ path: resolve(outputDir, "desktop-skills-solid-active.png"), fullPage: true });
  }
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(180);
  check(`${name}: Vite bordered icon remains distinct when active`,
    (await page.locator(".xmb-item.is-active .xmb-item-label").textContent())?.trim() === "Vite",
  );
  if (name === "desktop") {
    await page.screenshot({ path: resolve(outputDir, "desktop-skills-vite-active.png"), fullPage: true });
  }

  await page.locator('.xmb-category[aria-label="Contact"]').click();
  await page.waitForTimeout(260);
  const contactIcons = await page.locator(".xmb-item-icon").evaluateAll((images) => images.map((image) => ({
    src: image.getAttribute("src"),
    loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
  })));
  check(
    `${name}: Contact uses email GitHub and PDF icons`,
    JSON.stringify(contactIcons.map((item) => item.src)) ===
      JSON.stringify(["/psp/icons/email.svg", "/psp/icons/github.svg", "/psp/icons/pdf.svg"]) &&
      contactIcons.every((item) => item.loaded),
    JSON.stringify(contactIcons),
  );
  await page.screenshot({
    path: resolve(outputDir, name === "desktop" ? "desktop-contact-icons.png" : "mobile-contact-icons.png"),
    fullPage: true,
  });

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  check(
    `${name}: no root overflow`,
    overflow.scrollWidth <= overflow.clientWidth + 1 && overflow.scrollHeight <= overflow.clientHeight + 1,
    JSON.stringify(overflow),
  );
  check(`${name}: no console errors`, errors.length === 0, errors.join(" | "));
  check(`${name}: no failed responses`, failedResponses.length === 0, failedResponses.join(" | "));

  await page.close();
}

await visit("desktop", { width: 1440, height: 1000 });
await visit("mobile", { width: 390, height: 844 });
await browser.close();

const report = {
  url,
  generatedAt: new Date().toISOString(),
  passed: results.filter((result) => result.passed).length,
  total: results.length,
  failures,
  results,
};
await writeFile(resolve(outputDir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`XMB game-library acceptance: ${report.passed}/${report.total} passed`);
console.log(`Artifacts: ${outputDir}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
