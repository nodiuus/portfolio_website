---
title: Making Shadertoy Themes Portable
summary: A compatibility layer that turns dropped-in fragment shaders into live site themes.
published: August 8, 2026
readTime: 5 min read
category: Graphics
author: Nisan
tags: WebGL, Shaders, Tooling
order: 2
---
Shadertoy gives shaders a convenient environment: time, resolution, channel textures, multiple buffers, and several WebGL features are simply available. A browser canvas needs those pieces supplied explicitly.

## Rebuilding the Environment

The theme loader supplies the uniforms most Shadertoy fragments expect, including `iResolution`, `iTime`, `iMouse`, and four channel textures. The fragment can keep its familiar entry point:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
```

The loader wraps `mainImage`, translates compatible texture calls for WebGL 1, and enables standard derivatives when a shader uses functions such as `fwidth`.


## Supporting Multiple Buffers

Buffer files are grouped by filename and rendered into ping-pong textures. An image pass can then read the latest Buffer A through D frames through the normal `iChannel0` to `iChannel3` uniforms.

> A theme should be a file you can drop into a folder—not a new UI component you have to wire by hand.

## Matching the Interface

Color-aware shaders receive the selected XMB palette through `iThemeColorA` and `iThemeColorB`. Color-locked shaders keep their authored appearance instead.

For locked themes, the surrounding interface samples the rendered frame and derives a matching chrome palette. A blue underwater shader produces blue panels; the Xbox shader produces green panels. The shader remains the source of truth.

## Adding a Theme

Place the image shader in the theme folder:

```text
src/themes/shaders/my-theme.frag
```

Optional buffers use matching names such as `my-theme.buffer-a.frag`. The registry discovers and groups them during the Vite build.
