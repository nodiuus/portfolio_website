import type { XmbControlScheme, XmbDirection } from "./types";

type ControllerScheme = Exclude<XmbControlScheme, "keyboard">;

type GamepadControls = {
  navigate: (direction: XmbDirection) => void;
  confirm: () => void;
  back: () => void;
  openThemes: () => void;
  home: () => void;
  changeHue: (direction: -1 | 1) => void;
  onConnect?: () => void;
  onConnectionChange?: (scheme: ControllerScheme | null) => void;
};

const axisThreshold = 0.55;
const initialRepeatDelay = 320;
const repeatInterval = 105;
const hueRepeatInterval = 80;

function buttonPressed(gamepad: Gamepad, index: number) {
  const button = gamepad.buttons[index];
  return Boolean(button && (button.pressed || button.value > 0.55));
}

function controllerScheme(gamepad: Gamepad): ControllerScheme {
  const id = gamepad.id.toLowerCase();
  if (/playstation|dualshock|dualsense|sony|054c/.test(id)) return "playstation";
  if (/xbox|xinput|x-box|045e/.test(id)) return "xbox";
  return "generic";
}

function gamepadDirection(gamepad: Gamepad, heldDirection: XmbDirection | null): XmbDirection | null {
  const dpad = new Set<XmbDirection>();
  if (buttonPressed(gamepad, 12)) dpad.add("up");
  if (buttonPressed(gamepad, 13)) dpad.add("down");
  if (buttonPressed(gamepad, 14)) dpad.add("left");
  if (buttonPressed(gamepad, 15)) dpad.add("right");

  if (dpad.size) {
    if (heldDirection && dpad.has(heldDirection)) return heldDirection;
    return (["up", "down", "left", "right"] as XmbDirection[]).find((direction) => dpad.has(direction)) ?? null;
  }

  const horizontal = gamepad.axes[0] ?? 0;
  const vertical = gamepad.axes[1] ?? 0;
  if (Math.abs(horizontal) < axisThreshold && Math.abs(vertical) < axisThreshold) return null;
  if (Math.abs(horizontal) > Math.abs(vertical)) return horizontal < 0 ? "left" : "right";
  return vertical < 0 ? "up" : "down";
}

export function startGamepadControls(controls: GamepadControls) {
  let heldDirection: XmbDirection | null = null;
  let nextDirectionRepeat = 0;
  let heldHue: -1 | 1 | null = null;
  let nextHueRepeat = 0;
  let activeGamepad = -1;
  let pollTimer = 0;
  const heldButtons = new Set<number>();

  const pressOnce = (gamepad: Gamepad, index: number, action: () => void) => {
    const pressed = buttonPressed(gamepad, index);
    if (pressed && !heldButtons.has(index)) action();
    if (pressed) heldButtons.add(index);
    else heldButtons.delete(index);
  };

  const poll = () => {
    const time = performance.now();
    let gamepads: (Gamepad | null)[] | GamepadList;
    try {
      gamepads = navigator.getGamepads?.() ?? [];
    } catch {
      window.clearInterval(pollTimer);
      return;
    }
    const gamepad = Array.from(gamepads).find((entry): entry is Gamepad => Boolean(entry?.connected));

    if (!gamepad) {
      if (activeGamepad !== -1) controls.onConnectionChange?.(null);
      activeGamepad = -1;
      heldDirection = null;
      heldHue = null;
      heldButtons.clear();
      return;
    }

    if (activeGamepad !== gamepad.index) {
      activeGamepad = gamepad.index;
      heldDirection = null;
      heldHue = null;
      heldButtons.clear();
      controls.onConnect?.();
      controls.onConnectionChange?.(controllerScheme(gamepad));
    }

    const direction = gamepadDirection(gamepad, heldDirection);
    if (direction !== heldDirection) {
      heldDirection = direction;
      if (direction) {
        controls.navigate(direction);
        nextDirectionRepeat = time + initialRepeatDelay;
      }
    } else if (direction && time >= nextDirectionRepeat) {
      controls.navigate(direction);
      nextDirectionRepeat = time + repeatInterval;
    }

    const hueDirection = buttonPressed(gamepad, 4) || buttonPressed(gamepad, 6)
      ? -1
      : buttonPressed(gamepad, 5) || buttonPressed(gamepad, 7) ? 1 : null;
    if (hueDirection !== heldHue) {
      heldHue = hueDirection;
      if (hueDirection) {
        controls.changeHue(hueDirection);
        nextHueRepeat = time + initialRepeatDelay;
      }
    } else if (hueDirection && time >= nextHueRepeat) {
      controls.changeHue(hueDirection);
      nextHueRepeat = time + hueRepeatInterval;
    }

    // Standard Gamepad mapping: A/Cross, B/Circle, Y/Triangle, Start.
    pressOnce(gamepad, 0, controls.confirm);
    pressOnce(gamepad, 1, controls.back);
    pressOnce(gamepad, 3, controls.openThemes);
    pressOnce(gamepad, 9, controls.home);

  };

  pollTimer = window.setInterval(poll, 20);
  poll();
  return () => window.clearInterval(pollTimer);
}
