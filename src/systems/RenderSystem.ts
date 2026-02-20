export const VS_SOURCE = `#version 300 es
in vec2 a_position;
in float a_radius;
in vec3 a_color;

uniform vec2 u_resolution;

out vec3 v_color;
out float v_radius;

void main() {
  vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  gl_PointSize = a_radius * 2.0;
  v_color = a_color;
  v_radius = a_radius;
}
`;

export const FS_SOURCE = `#version 300 es
precision mediump float;
in vec3 v_color;
in float v_radius;
out vec4 outColor;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float dist = length(coord);
  if (dist > 1.0) discard;
  float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
  outColor = vec4(v_color, alpha);
}
`;

import { System } from '../ecs/types';
import { World } from '../ecs/World';
import { VerletBody, COMPONENT_VERLET_BODY, COMPONENT_PLAYER, COMPONENT_FOOD } from '../components/VerletBody';
import { Shader } from '../core/Shader';

export class RenderSystem extends System {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private shader: Shader | null = null;

  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private radiusBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  private maxParticles = 10000;
  private positions: Float32Array;
  private radii: Float32Array;
  private colors: Float32Array;

  constructor(canvasId: string) {
    super();
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error(`Canvas '${canvasId}' not found`);

    this.gl = this.canvas.getContext('webgl2', { alpha: false });
    if (!this.gl) console.error('WebGL 2.0 required');

    this.positions = new Float32Array(this.maxParticles * 2);
    this.radii = new Float32Array(this.maxParticles);
    this.colors = new Float32Array(this.maxParticles * 3);
  }

  init(): void {
    if (!this.gl) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.shader = new Shader(this.gl, VS_SOURCE, FS_SOURCE);
    this.shader.use();

    this.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vao);

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions.byteLength, this.gl.DYNAMIC_DRAW);
    const posLoc = this.gl.getAttribLocation(this.shader.program!, 'a_position');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.radiusBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.radiusBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.radii.byteLength, this.gl.DYNAMIC_DRAW);
    const radLoc = this.gl.getAttribLocation(this.shader.program!, 'a_radius');
    this.gl.enableVertexAttribArray(radLoc);
    this.gl.vertexAttribPointer(radLoc, 1, this.gl.FLOAT, false, 0, 0);

    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors.byteLength, this.gl.DYNAMIC_DRAW);
    const colLoc = this.gl.getAttribLocation(this.shader.program!, 'a_color');
    this.gl.enableVertexAttribArray(colLoc);
    this.gl.vertexAttribPointer(colLoc, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(): void {
    if (!this.gl) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  update(_dt: number): void {
    if (!this.gl || !this.shader || !this.world) return;

    const world = this.world as World;
    const entities = world.getEntitiesWith([COMPONENT_VERLET_BODY]);

    let count = 0;

    // Simple logic to color players vs food
    // We need to know which is which. World check?
    // Optimization: Store entity Type in a Tag component or check existence

    for (const entity of entities) {
      const body = world.getComponent<VerletBody>(entity, COMPONENT_VERLET_BODY);
      if (!body) continue;

      let r = 0.5, g = 0.5, b = 0.5;
      if (world.hasComponent(entity, COMPONENT_PLAYER)) {
        r = 0.0; g = 1.0; b = 1.0; // Cyan Player
      } else if (world.hasComponent(entity, COMPONENT_FOOD)) {
        r = 0.0; g = 0.8; b = 0.2; // Green Food
      } else {
        r = 1.0; g = 0.2; b = 0.2; // Enemy?
      }

      const pCount = body.pointCount;
      const stride = VerletBody.STRIDE;

      for (let i = 0; i < pCount; i++) {
        if (count >= this.maxParticles) break;

        const idx = i * stride;
        // Check pinned status for visual debugging? (Maybe draw pinned as white)
        // const isPinned = body.points[idx + 5] > 0.5;

        this.positions[count * 2] = body.points[idx];
        this.positions[count * 2 + 1] = body.points[idx + 1];
        this.radii[count] = body.points[idx + 4];

        this.colors[count * 3] = r;
        this.colors[count * 3 + 1] = g;
        this.colors[count * 3 + 2] = b;

        count++;
      }
    }

    this.gl.useProgram(this.shader.program);
    const uRes = this.shader.getUniformLocation('u_resolution');
    this.gl.uniform2f(uRes, this.canvas.width, this.canvas.height);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.positions.subarray(0, count * 2));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.radiusBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.radii.subarray(0, count));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.colors.subarray(0, count * 3));

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.POINTS, 0, count);
  }
}
