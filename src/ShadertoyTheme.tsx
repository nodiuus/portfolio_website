import { onCleanup, onMount } from "solid-js";
import type { ThemePalette } from "./types";

type ShaderCanvas = HTMLCanvasElement & { __xmbFrames?: number };
type Uniforms = ReturnType<typeof getUniforms>;
type ProgramBundle = { program: WebGLProgram; uniforms: Uniforms };

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const suppliedUniforms = [
  ["vec3", "iResolution"],
  ["float", "iTime"],
  ["float", "iTimeDelta"],
  ["float", "iFrameRate"],
  ["int", "iFrame"],
  ["float", "iChannelTime[4]"],
  ["vec3", "iChannelResolution[4]"],
  ["sampler2D", "iChannel0"],
  ["sampler2D", "iChannel1"],
  ["sampler2D", "iChannel2"],
  ["sampler2D", "iChannel3"],
  ["vec4", "iMouse"],
  ["vec4", "iDate"],
  ["float", "iSampleRate"],
  ["vec3", "iThemeColorA"],
  ["vec3", "iThemeColorB"],
] as const;

function prepareFragmentShader(source: string, standardDerivatives: boolean) {
  const cleaned = source
    .replace(/^\s*#version[^\n]*\n/, "")
    .replace(/\btexture\s*\(/g, "texture2D(");
  const extensions = standardDerivatives && /\b(?:dFdx|dFdy|fwidth)\s*\(/.test(cleaned)
    ? "#extension GL_OES_standard_derivatives : enable\n"
    : "";
  const precision = /precision\s+(?:lowp|mediump|highp)\s+float\s*;/.test(cleaned)
    ? ""
    : "precision highp float;\n";
  const uniforms = suppliedUniforms
    .filter(([, declaration]) => {
      const name = declaration.replace(/\[.*$/, "");
      return !new RegExp(`uniform\\s+\\w+\\s+${name}(?:\\s*\\[[^\\]]+\\])?\\s*;`).test(cleaned);
    })
    .map(([type, declaration]) => `uniform ${type} ${declaration};`)
    .join("\n");
  const entryPoint = /void\s+main\s*\(/.test(cleaned)
    ? ""
    : "\nvoid main() { mainImage(gl_FragColor, gl_FragCoord.xy); }\n";
  return `${extensions}${precision}${uniforms}\n${cleaned}${entryPoint}`;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("XMB theme shader failed to compile:\n", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function getUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  return {
    resolution: uniform("iResolution"),
    time: uniform("iTime"),
    timeDelta: uniform("iTimeDelta"),
    frameRate: uniform("iFrameRate"),
    frame: uniform("iFrame"),
    channelTime: uniform("iChannelTime[0]"),
    channelResolution: uniform("iChannelResolution[0]"),
    channels: [uniform("iChannel0"), uniform("iChannel1"), uniform("iChannel2"), uniform("iChannel3")],
    mouse: uniform("iMouse"),
    date: uniform("iDate"),
    sampleRate: uniform("iSampleRate"),
    colorA: uniform("iThemeColorA"),
    colorB: uniform("iThemeColorB"),
  };
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, source: string) {
  const usesStandardDerivatives = /\b(?:dFdx|dFdy|fwidth)\s*\(/.test(source);
  const standardDerivatives = usesStandardDerivatives
    ? Boolean(gl.getExtension("OES_standard_derivatives"))
    : false;
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, prepareFragmentShader(source, standardDerivatives));
  if (!fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("XMB theme shader failed to link:\n", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return { program, uniforms: getUniforms(gl, program) };
}

function rgb(color: string) {
  const hex = color.replace("#", "");
  const value = Number.parseInt(hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255] as const;
}

function hexChannel(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0");
}

function paletteFromCanvas(gl: WebGLRenderingContext, width: number, height: number): ThemePalette | undefined {
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const stepX = Math.max(1, Math.floor(width / 32));
  const stepY = Math.max(1, Math.floor(height / 20));
  let red = 0;
  let green = 0;
  let blue = 0;
  let totalWeight = 0;
  let samples = 0;

  for (let y = Math.floor(stepY / 2); y < height; y += stepY) {
    for (let x = Math.floor(stepX / 2); x < width; x += stepX) {
      const offset = (y * width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const brightest = Math.max(r, g, b);
      const chroma = brightest - Math.min(r, g, b);
      if (brightest < 10 || chroma < 4) continue;

      const weight = (chroma + 12) * (brightest + 20);
      red += r * weight;
      green += g * weight;
      blue += b * weight;
      totalWeight += weight;
      samples += 1;
    }
  }

  if (samples < 3 || totalWeight === 0) return undefined;

  const average = [red / totalWeight, green / totalWeight, blue / totalWeight];
  const peak = Math.max(...average);
  const scale = peak > 0 ? Math.min(3, 180 / peak) : 1;
  const accent = average.map((channel) => Math.min(255, channel * scale));
  const asHex = (channels: number[]) => `#${channels.map(hexChannel).join("")}`;
  const rgba = (alpha: number, multiplier = 1) =>
    `rgba(${accent.map((channel) => Math.round(Math.min(255, channel * multiplier))).join(", ")}, ${alpha})`;

  return {
    start: asHex(accent.map((channel) => channel * 0.12)),
    middle: asHex(accent.map((channel) => channel * 0.38)),
    end: asHex(accent),
    glow: rgba(0.32, 1.12),
    wavePrimary: rgba(0.48, 1.15),
    waveSecondary: rgba(0.28, 0.78),
    waveTertiary: rgba(0.2, 0.52),
  };
}

export default function ShadertoyTheme(props: {
  animated: boolean;
  palette: ThemePalette;
  shader: string;
  buffers?: Array<string | undefined>;
  preview?: boolean;
  onThemePalette?: (palette: ThemePalette) => void;
}) {
  let canvas!: ShaderCanvas;

  onMount(() => {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      canvas.dataset.shaderError = "webgl-unavailable";
      return;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    if (!vertexShader) return;
    const imageProgram = createProgram(gl, vertexShader, props.shader);
    const bufferPrograms = Array.from({ length: 4 }, (_, index) => {
      const source = props.buffers?.[index];
      return source ? createProgram(gl, vertexShader, source) : undefined;
    });
    if (!imageProgram || bufferPrograms.some((program, index) => props.buffers?.[index] && !program)) {
      canvas.dataset.shaderError = "compile-failed";
      return;
    }

    const allPrograms = [imageProgram, ...bufferPrograms.filter(Boolean)] as ProgramBundle[];
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    for (const bundle of allPrograms) {
      const position = gl.getAttribLocation(bundle.program, "a_position");
      gl.useProgram(bundle.program);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    }

    const framebuffer = gl.createFramebuffer();
    const blackTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blackTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    let passTextures: Array<[WebGLTexture, WebGLTexture] | undefined> = [];
    const readIndices = [0, 0, 0, 0];
    let textureWidth = 0;
    let textureHeight = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const started = performance.now();
    const mouse = [0, 0, 0, 0];
    let lastStamp = started;
    let raf = 0;
    let frame = 0;

    function createTexture(width: number, height: number) {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return texture;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const scale = props.preview ? 0.8 : Math.min(window.devicePixelRatio || 1, 1) * 0.72;
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (textureWidth !== width || textureHeight !== height) {
        passTextures.flat().filter(Boolean).forEach((texture) => gl.deleteTexture(texture!));
        passTextures = bufferPrograms.map((program) => program
          ? [createTexture(width, height), createTexture(width, height)]
          : undefined);
        readIndices.fill(0);
        textureWidth = width;
        textureHeight = height;
      }
    }

    function setUniforms(bundle: ProgramBundle, stamp: number, channelTextures: WebGLTexture[]) {
      const elapsed = (stamp - started) / 1000;
      const delta = Math.max(0, stamp - lastStamp) / 1000;
      const now = new Date();
      const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
      const colorA = rgb(props.palette.middle);
      const colorB = rgb(props.palette.end);
      gl.useProgram(bundle.program);
      gl.uniform3f(bundle.uniforms.resolution, canvas.width, canvas.height, 1);
      gl.uniform1f(bundle.uniforms.time, elapsed);
      gl.uniform1f(bundle.uniforms.timeDelta, delta);
      gl.uniform1f(bundle.uniforms.frameRate, delta > 0 ? 1 / delta : 60);
      gl.uniform1i(bundle.uniforms.frame, frame);
      gl.uniform1fv(bundle.uniforms.channelTime, new Float32Array([elapsed, elapsed, elapsed, elapsed]));
      gl.uniform3fv(bundle.uniforms.channelResolution, new Float32Array([
        canvas.width, canvas.height, 1, canvas.width, canvas.height, 1,
        canvas.width, canvas.height, 1, canvas.width, canvas.height, 1,
      ]));
      gl.uniform4f(bundle.uniforms.mouse, mouse[0], mouse[1], mouse[2], mouse[3]);
      gl.uniform4f(bundle.uniforms.date, now.getFullYear(), now.getMonth() + 1, now.getDate(), seconds);
      gl.uniform1f(bundle.uniforms.sampleRate, 44100);
      gl.uniform3f(bundle.uniforms.colorA, colorA[0], colorA[1], colorA[2]);
      gl.uniform3f(bundle.uniforms.colorB, colorB[0], colorB[1], colorB[2]);
      for (let index = 0; index < 4; index += 1) {
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, channelTextures[index] ?? blackTexture);
        gl.uniform1i(bundle.uniforms.channels[index], index);
      }
    }

    function render(bundle: ProgramBundle, target: WebGLTexture | null, stamp: number, channels: WebGLTexture[]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? framebuffer : null);
      if (target) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
      gl.viewport(0, 0, canvas.width, canvas.height);
      setUniforms(bundle, stamp, channels);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw(stamp = performance.now()) {
      resize();
      const channels = Array.from({ length: 4 }, (_, index) => passTextures[index]?.[readIndices[index]] ?? blackTexture!);
      for (let index = 0; index < 4; index += 1) {
        const bundle = bufferPrograms[index];
        const textures = passTextures[index];
        if (!bundle || !textures) continue;
        const writeIndex = 1 - readIndices[index];
        render(bundle, textures[writeIndex], stamp, channels);
        readIndices[index] = writeIndex;
        channels[index] = textures[writeIndex];
      }
      render(imageProgram, null, stamp, channels);
      if (props.onThemePalette && (frame === 7 || (frame > 7 && frame % 240 === 0))) {
        const sampledPalette = paletteFromCanvas(gl, canvas.width, canvas.height);
        if (sampledPalette) props.onThemePalette(sampledPalette);
      }
      lastStamp = stamp;
      frame += 1;
      canvas.__xmbFrames = frame;
    }

    function tick(stamp: number) {
      draw(stamp);
      raf = requestAnimationFrame(tick);
    }

    function updateMouse(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      mouse[0] = (event.clientX - rect.left) * canvas.width / rect.width;
      mouse[1] = (rect.bottom - event.clientY) * canvas.height / rect.height;
    }

    const pointerDown = (event: PointerEvent) => {
      updateMouse(event);
      mouse[2] = mouse[0];
      mouse[3] = mouse[1];
    };
    const pointerUp = () => {
      mouse[2] = -Math.abs(mouse[2]);
      mouse[3] = -Math.abs(mouse[3]);
    };
    canvas.addEventListener("pointermove", updateMouse);
    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    draw();
    if (props.animated && !reduced.matches) raf = requestAnimationFrame(tick);

    onCleanup(() => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", updateMouse);
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      passTextures.flat().filter(Boolean).forEach((texture) => gl.deleteTexture(texture!));
      gl.deleteTexture(blackTexture);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteBuffer(buffer);
      allPrograms.forEach((bundle) => gl.deleteProgram(bundle.program));
      gl.deleteShader(vertexShader);
    });
  });

  return (
    <canvas
      class="xmb-shader"
      classList={{ "xmb-shader-theme": !props.preview, "xmb-theme-preview-canvas": props.preview }}
      ref={canvas}
      aria-hidden="true"
    />
  );
}
