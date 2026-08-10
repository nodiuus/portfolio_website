import { createMemo } from "solid-js";
import { hexToHsv, hsvToHex } from "../color";
import { getControlLabels } from "../controlHints";
import type { XmbControlScheme } from "../types";

type KeyboardColorPickerProps = {
  label: string;
  color: string;
  controlScheme: XmbControlScheme;
  onChange: (color: string) => void;
};

export function KeyboardColorPicker(props: KeyboardColorPickerProps) {
  const hsv = createMemo(() => hexToHsv(props.color));
  const controls = () => getControlLabels(props.controlScheme);

  const pickSaturationValue = (event: PointerEvent & { currentTarget: HTMLButtonElement }) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = ((event.clientX - bounds.left) / bounds.width) * 100;
    const value = (1 - (event.clientY - bounds.top) / bounds.height) * 100;
    props.onChange(hsvToHex({ ...hsv(), saturation, value }));
  };

  const pickHue = (event: PointerEvent & { currentTarget: HTMLButtonElement }) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const hue = ((event.clientX - bounds.left) / bounds.width) * 360;
    props.onChange(hsvToHex({ ...hsv(), hue }));
  };

  return (
    <section
      class="xmb-keyboard-color-picker"
      aria-label={`${props.label} color picker`}
      style={{
        "--picker-color": props.color,
        "--picker-hue": `${hsv().hue}`,
        "--picker-saturation": `${hsv().saturation}%`,
        "--picker-value": `${hsv().value}%`,
      }}
    >
      <header>
        <span class="xmb-color-current" aria-hidden="true" />
        <span><small>Custom color</small><h3>{props.label}</h3></span>
        <code>{props.color.toUpperCase()}</code>
      </header>

      <button
        type="button"
        class="xmb-color-sv-field"
        aria-label={props.controlScheme === "keyboard"
          ? "Saturation and brightness. Left and right change saturation; up and down change brightness."
          : `Saturation and brightness. Use ${controls().move} to adjust.`}
        onPointerDown={pickSaturationValue}
      >
        <span class="xmb-color-sv-marker" />
      </button>

      <div class="xmb-color-meter-copy" aria-hidden="true">
        <span>Saturation <b>{Math.round(hsv().saturation)}%</b></span>
        <span>Brightness <b>{Math.round(hsv().value)}%</b></span>
      </div>

      <button type="button" class="xmb-color-hue-strip" aria-label={`Hue. Use ${controls().hueDown} and ${controls().hueUp} to change hue.`} onPointerDown={pickHue}>
        <span class="xmb-color-hue-marker" />
      </button>
      <div class="xmb-color-meter-copy" aria-hidden="true"><span>Hue <b>{Math.round(hsv().hue)}°</b></span></div>

      <p>
        {props.controlScheme === "keyboard"
          ? <><kbd>←</kbd><kbd>→</kbd> Saturation <kbd>↑</kbd><kbd>↓</kbd> Brightness</>
          : <><kbd>{controls().move}</kbd> Saturation / Brightness</>}
        {" "}<kbd>{controls().hueDown}</kbd><kbd>{controls().hueUp}</kbd> Hue
      </p>
    </section>
  );
}
