#version 300 es

#define PI 3.141592564

precision highp float;

uniform float u_time;
uniform vec2 u_streamSize;
uniform sampler2D u_texture;
uniform bool u_flipX;
uniform float u_xWaveAmp;
uniform float u_xWaveFreq;
uniform float u_xWaveOscAmp;
uniform float u_xWaveOscFreq;

in vec4 v_position;
in vec2 v_texcoord;

out vec4 fragColor;

void main() {
  vec2 uv = v_texcoord / u_streamSize;

  float xWaveOscAmpFactor =
      1.0 - u_xWaveOscAmp + u_xWaveOscAmp * sin(2.0 * PI * (u_time / 1000.0) * u_xWaveOscFreq);
  uv.y += (u_xWaveAmp * xWaveOscAmpFactor / u_streamSize.y) * sin(2.0 * PI * uv.x * u_xWaveFreq);

  if (u_flipX) {
    uv.x = 1.0 - uv.x;
  }

  fragColor = texture(u_texture, uv);
}
