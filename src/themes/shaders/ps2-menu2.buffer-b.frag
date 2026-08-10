#define clamps(x) clamp(x,0.,1.)
float pi = 3.14159265358979323;

vec2 circle(float angle) {
  return vec2(cos(angle), sin(angle));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec4 drawing = vec4(0.);
  #define L 8.
  for (float i = 0.; i < L; i++) {
    vec2 point = circle((i / L) * pi * 2.);
    point.x /= iResolution.x / iResolution.y;
    drawing = max(drawing, texture(iChannel1, uv + point * 0.00015));
  }
  fragColor = pow(texture(iChannel0, uv), vec4(10.)) + clamps(drawing) * 0.95;
}
