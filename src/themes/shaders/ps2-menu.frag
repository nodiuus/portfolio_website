// Self-contained single-pass adaptation of:
// https://www.shadertoy.com/view/ldc3z4
// The original effect uses feedback buffers through iChannel0/iChannel1.
// This drop-in version recreates its orbiting light trails analytically and
// uses the XMB Color setting through iThemeColorA/iThemeColorB.
// Original Shadertoy work is attributed under its default CC BY-NC-SA 3.0 terms.

#define PI 3.14159265358979323846

vec3 rotateX(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotateZ(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

vec2 orbitPoint(float index, float time) {
  float phase = index / 8.0 * 2.0 * PI;
  float direction = time * 0.2 + phase;
  vec3 position = vec3(cos(direction) * 0.32, sin(direction) * 0.32, 0.0);
  position = rotateY(position, time * 0.5);
  position = rotateZ(position, time * 0.3);
  position = rotateX(position, time * 0.4);
  return position.xy;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime;
  float trail = 0.0;
  float hotCore = 0.0;

  for (int orb = 0; orb < 8; orb++) {
    for (int step = 0; step < 7; step++) {
      float age = float(step) * 0.085;
      vec2 point = orbitPoint(float(orb), time - age);
      float distanceToTrail = length(uv - point);
      float glow = 0.0018 / (distanceToTrail * distanceToTrail + 0.0016);
      trail += glow * (1.0 - float(step) / 7.0);
      if (step == 0) hotCore += smoothstep(0.072, 0.0, distanceToTrail);
    }
  }

  float centerFog = max(0.0, 1.0 - length(uv) * 0.76);
  float pulse = 0.78 + 0.22 * sin(time * 0.7);
  vec3 color = vec3(0.0015, 0.002, 0.006);
  color += iThemeColorA * trail * 0.4 * pulse;
  color += iThemeColorB * trail * trail * 0.13;
  color += mix(iThemeColorB, vec3(1.0), 0.62) * hotCore * 0.85;
  color += iThemeColorA * centerFog * 0.035;

  float vignette = 1.0 - smoothstep(0.62, 1.45, length(uv));
  color *= 0.25 + vignette * 0.9;
  fragColor = vec4(pow(color, vec3(0.86)), 1.0);
}
