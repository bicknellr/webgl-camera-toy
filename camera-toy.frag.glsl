#version 300 es

precision highp float;

uniform vec2 u_streamSize;
uniform sampler2D u_texture;
uniform bool u_flipX;

in vec4 v_position;
in vec2 v_texcoord;

out vec4 fragColor;

void main() {
  vec2 uv = v_texcoord / u_streamSize;

  if (u_flipX) {
    uv.x = 1.0 - uv.x;
  }

  fragColor = texture(u_texture, uv);
}
