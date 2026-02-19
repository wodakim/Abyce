export const vertexShaderSource = `#version 300 es
precision highp float;

// Per-vertex data (Quad vertices)
layout(location = 0) in vec2 a_quad; // The unit quad [-1, 1]

// Per-instance data
layout(location = 1) in vec2 a_position; // Instance position (center)
layout(location = 2) in float a_radius; // Instance radius
layout(location = 3) in vec3 a_color; // Instance color

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;

out vec3 v_color;
out vec2 v_uv;

void main() {
    // Transform unit quad to world space
    // Scale by radius (Physics faithful)
    float visualRadius = a_radius;

    vec2 worldPos = (a_quad * visualRadius) + a_position;

    // Apply Camera Transform
    // Center 0,0 is the camera position
    vec2 viewPos = (worldPos - u_camera) * u_zoom;

    // Convert to Clip Space
    // Divide by resolution/2 to get -1 to 1 range (assuming viewPos is in pixels)
    // u_resolution is full width/height.
    // clip = viewPos / (u_resolution / 2.0)
    vec2 clipSpace = (viewPos / u_resolution) * 2.0;

    // Flip Y because WebGL Y is up, but our World Y is down
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

    // Gaussian falloff for metaballs
    // exp(-k * dist^2)
    float alpha = exp(-4.0 * dist * dist);

    // Don't discard yet, we accumulate alpha in the framebuffer
    if (alpha < 0.01) discard;

    outColor = vec4(v_color * alpha, alpha); // Pre-multiplied alpha kind of approach for accumulation
}
`;

// Post-processing threshold shader
export const ppVertexShader = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5; // [-1,1] -> [0,1]
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const ppFragmentShader = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
in vec2 v_uv;
out vec4 outColor;

void main() {
    vec4 color = texture(u_texture, v_uv);

    // Thresholding
    // If alpha > threshold, solid color.
    // Use smoothstep for anti-aliased edge.

    float threshold = 0.6;
    float edge = 0.05;

    float alpha = smoothstep(threshold - edge, threshold + edge, color.a);

    if (alpha < 0.01) discard; // Transparent background

    // Reconstruct color (approximate, since we blended colors)
    // If we have multi-colored metaballs, simple accumulation might muddy them.
    // But for now, let's just output the accumulated color normalized by alpha?
    // color.rgb / color.a might work if we did premultiplied.

    vec3 finalColor = color.rgb / max(color.a, 0.001);

    // Add a rim light or simple shading?
    // For flat cartoon style:
    outColor = vec4(finalColor, 1.0);
}
`;
