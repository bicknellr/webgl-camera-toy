#version 300 es

uniform vec2 u_resolution;

in vec4 a_position;
in vec2 a_texcoord;

out vec4 v_position;
out vec2 v_texcoord;

void main() {
  v_position = a_position;
  v_texcoord = a_texcoord;
  gl_Position = a_position;
}
