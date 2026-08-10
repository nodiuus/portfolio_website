float pi = 3.14159265358979323;
#define clamps(x) clamp(x,0.,1.)

vec3 rX(vec3 p, float a) {
  float c, s;
  vec3 q = p;
  c = cos(a);
  s = sin(a);
  p.y = c * q.y - s * q.z;
  p.z = s * q.y + c * q.z;
  return p;
}

vec3 rY(vec3 p, float a) {
  float c, s;
  vec3 q = p;
  c = cos(a);
  s = sin(a);
  p.x = c * q.x + s * q.z;
  p.z = -s * q.x + c * q.z;
  return p;
}

vec3 rZ(vec3 p, float a) {
  float c, s;
  vec3 q = p;
  c = cos(a);
  s = sin(a);
  p.x = c * q.x - s * q.y;
  p.y = s * q.x + c * q.y;
  return p;
}

vec2 dirDist(float direction, float distance) {
  return vec2(cos(direction) * distance, sin(direction) * distance);
}

vec3 animation(vec2 uv, float time) {
  float circles = 0.;
  for (float k = 0.; k < 8.; k++) {
    float direction = time * k * 0.1;
    vec3 position = vec3(dirDist(direction, 0.2), 0.);
    position = rY(position, time * 1.1);
    position = rZ(position, time * 2.15);
    position = rX(position, time * 0.52);
    circles = max(circles, clamps(1. - length(uv - position.xy) * 40.));
  }
  return vec3(clamp(circles, 0., 1.));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 suv = uv - 0.5;
  suv.x /= iResolution.y / iResolution.x;
  vec3 drawing = animation(suv, iTime);
  drawing = pow(drawing, vec3(2.5, 1.8, 1.));
  fragColor = vec4(drawing, 1.);
}
