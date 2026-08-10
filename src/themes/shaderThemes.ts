import type { XmbBackgroundTheme } from "../types";

const shaderFiles = import.meta.glob("./shaders/*.frag", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const titleFromFilename = (path: string) => path
  .split("/").pop()!
  .replace(/\.frag$/i, "")
  .split(/[-_]+/)
  .map((word) => /^ps\d$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");

export const shaderThemes: XmbBackgroundTheme[] = Object.entries(shaderFiles)
  .filter(([path]) => !/\.buffer-[a-d]\.frag$/i.test(path))
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([path, shader]) => {
    const id = path.split("/").pop()!.replace(/\.frag$/i, "");
    const shaderBuffers = ["a", "b", "c", "d"].map((letter) => (
      shaderFiles[path.replace(/\.frag$/i, `.buffer-${letter}.frag`)]
    ));
    const combinedSource = [shader, ...shaderBuffers].filter(Boolean).join("\n");
    const colorDirective = combinedSource.match(/@xmb-color\s*:\s*(enabled|locked)/i)?.[1].toLowerCase();
    const supportsColor = colorDirective
      ? colorDirective === "enabled"
      : /\biThemeColor[AB]\b/.test(combinedSource);
    return {
      id,
      label: titleFromFilename(path),
      kind: "shader",
      shader,
      shaderBuffers: shaderBuffers.some(Boolean) ? shaderBuffers : undefined,
      supportsColor,
      preview: "#020205",
    };
  });
