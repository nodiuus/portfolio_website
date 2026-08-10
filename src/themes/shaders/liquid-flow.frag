// Drop-in Shadertoy-style theme.
// The runtime supplies iResolution, iTime, iTimeDelta, iFrame, iMouse,
// iThemeColorA, and iThemeColorB. Only mainImage is required.

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  mat2 rotation = mat2(0.84, -0.54, 0.54, 0.84);
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 17.17;
    amplitude *= 0.5;
  }
  return value;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime * 0.12;
  vec2 p = uv * 1.08;

  vec2 firstWarp = vec2(
    fbm(p * 1.08 + vec2(time, -time * 0.64)),
    fbm(p * 1.08 + vec2(5.2 - time * 0.72, 1.3 + time * 0.5))
  );
  vec2 secondWarp = vec2(
    fbm(p * 1.34 + firstWarp * 3.1 + vec2(1.7, 9.2) + time * 0.42),
    fbm(p * 1.34 + firstWarp * 3.1 + vec2(8.3, 2.8) - time * 0.36)
  );

  vec2 flow = p + (firstWarp - 0.5) * 1.45 + (secondWarp - 0.5) * 1.75;
  float foldA = sin(flow.x * 3.6 + flow.y * 1.45 + secondWarp.x * 5.2 - time * 1.3);
  float foldB = sin(flow.y * 4.1 - flow.x * 1.2 + firstWarp.y * 5.8 + time * 0.86);
  float turbulence = fbm(flow * 1.7 + secondWarp * 1.8 - time * 0.18);

  float greenField = foldA + (turbulence - 0.5) * 0.52;
  float violetField = foldB - (turbulence - 0.5) * 0.46;
  float greenBody = 1.0 - smoothstep(0.24, 0.74, abs(greenField - 0.16));
  float violetBody = 1.0 - smoothstep(0.22, 0.7, abs(violetField + 0.1));
  greenBody *= greenBody * (1.0 - violetBody * 0.54);
  violetBody *= violetBody * (1.0 - greenBody * 0.32);

  float greenFilament = 1.0 - smoothstep(0.035, 0.14, abs(greenField - 0.16));
  float violetFilament = 1.0 - smoothstep(0.03, 0.13, abs(violetField + 0.1));
  float darkVeins = smoothstep(0.18, 0.68, abs(foldA * foldB));

  vec3 color = vec3(0.002, 0.003, 0.008);
  color += iThemeColorA * greenBody * (0.52 + turbulence) * 0.68;
  color += iThemeColorB * violetBody * (0.58 + firstWarp.x) * 0.72;
  color += mix(iThemeColorA, vec3(1.0), 0.3) * greenFilament * greenBody * 0.4;
  color += mix(iThemeColorB, vec3(1.0), 0.28) * violetFilament * violetBody * 0.38;
  color *= mix(0.42, 1.12, darkVeins);

  float vignette = 1.0 - smoothstep(0.55, 1.48, length(uv * vec2(0.82, 1.0)));
  color *= 0.34 + vignette * 0.86;
  color = pow(color, vec3(0.88));
  fragColor = vec4(color, 1.0);
}
