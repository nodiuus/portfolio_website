float sdHexagon( in vec2 p, in float r )
{
    const vec3 k = vec3(-0.866025404,0.5,0.577350269);
    p = abs(p);
    p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
    p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
    return length(p)*sign(p.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    uv = (uv-0.5) * vec2(iResolution.x/iResolution.y, 1) + 0.5;
    
    const float distortion = 0.8;
    
    vec2 p = uv * 2.0 - 1.0;
    float theta = length(p) * distortion;
    vec2 projected = normalize(p) * sin(theta);
    uv = (1. + projected)*0.5;
    
    vec2 t = vec2(0.,iTime*0.5);
        
    const vec2 ar = vec2(1.,sqrt(3.) / 2.);
    float sc = 4.;
    vec2 skew = vec2(0.,(uv.x-0.5)*sc*0.5);
    p = fract((uv-0.5)*vec2(1.,1.15) * sc * ar + skew+t*0.5) / ar;
    
    const float r = 1.0 / (2.0 * sqrt(3.0));
    const float o = 0.08;
   
    // hexes
    float c = 1.;
    c = min(c, abs(sdHexagon(p-vec2(0., 0.5+o), r)));
    c = min(c, abs(sdHexagon(p-vec2(1, 0.5+o), r)));
    c = min(c, abs(sdHexagon(p-vec2(0.5, r + 0.5+o), r)));
    c = min(c, abs(sdHexagon(p-vec2(0.5, 1.-(r + 0.5-o)), r)));
    
    // xy grid
    p = fract((uv-0.5)*sc*2.+0.5+t);
    p = abs(p*2.-1.);
    c = min(c, min(p.x, p.y)/4.);
    
    // diag
    p = fract((uv-0.5)*sc*2.+0.25+t);
    c = min(c, abs(fract(p.x+p.y)*2.-1.)/4.);
    
    float br = exp(-c)*(0.5+2.*length(uv-0.5));
    c = smoothstep(fwidth(uv.x)*sc*2., 0., c);
    c += br;
    fragColor = vec4(.1,.25,.05, 1.) * vec4(c);
}