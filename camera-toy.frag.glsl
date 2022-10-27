#version 300 es

#define PI 3.141592564

precision highp float;

uniform vec2 u_streamSize;
uniform sampler2D u_texture;
uniform bool u_flipX;
uniform float u_xWaveFreq;
uniform float u_xWaveAmp;

in vec4 v_position;
in vec2 v_texcoord;

out vec4 fragColor;

void main() {
  vec2 uv = v_texcoord / u_streamSize;

  uv.y += (u_xWaveAmp / u_streamSize.y) * sin(2.0 * PI * uv.x * u_xWaveFreq);

  if (u_flipX) {
    uv.x = 1.0 - uv.x;
  }

  fragColor = texture(u_texture, uv);
}
