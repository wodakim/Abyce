export const vertexShaderSource = `#version 300 es
precision highp float;

// Per-vertex data (Quad vertices)
layout(location = 0) in vec2 a_quad; // The unit quad [-1, 1]

// Per-instance data
layout(location = 1) in vec2 a_position; // Instance position (center)
layout(location = 2) in float a_radius; // Instance radius
layout(location = 3) in vec3 a_color; // Instance color

uniform vec2 u_resolution;

out vec3 v_color;
out vec2 v_uv;

void main() {
    // Transform unit quad to world space
    // Scale by radius, Translate by position
    vec2 worldPos = (a_quad * a_radius) + a_position;

    // Convert to Clip Space [-1, 1]
    // Normalized Device Coordinates (NDC)
    // 0,0 is bottom-left in WebGL. Canvas 0,0 is top-left.
    // To match canvas (0,0 top-left), we need to flip Y.

    vec2 zeroToOne = worldPos / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);

    v_color = a_color;
    v_uv = a_quad; // Pass UVs [-1, 1] to fragment
}
`;

export const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec3 v_color;
in vec2 v_uv;

out vec4 outColor;

void main() {
    float dist = length(v_uv);
    float alpha = 1.0 - smoothstep(0.85, 1.0, dist);

    if (alpha < 0.01) discard;

    outColor = vec4(v_color, alpha);
}
`;
