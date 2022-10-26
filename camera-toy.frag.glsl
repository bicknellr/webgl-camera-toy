#version 300 es

precision highp float;

uniform vec2 u_streamSize;
uniform sampler2D u_texture;

in vec4 v_position;
in vec2 v_texcoord;

out vec4 fragColor;

void main() {
  fragColor = texture(u_texture, v_texcoord / u_streamSize);
}
