// src/core/rendering/RenderSystem.ts

import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

// Constants
const MAX_INSTANCES = 10000;
const INSTANCE_STRIDE = 6; // x, y, radius, r, g, b (6 floats)

export class RenderSystem {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  // Component Managers
  private positionManager: ComponentManager<Float32Array>;
  private verletPointManager: ComponentManager<Float32Array>;

  // WebGL Objects
  private vao: WebGLVertexArrayObject | null = null;
  private instanceBuffer: WebGLBuffer | null = null;

  // CPU Buffers
  private instanceData: Float32Array;

  constructor(world: World, canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error(`Canvas with id "${canvasId}" not found`);

    const gl = this.canvas.getContext('webgl2');
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.positionManager = world.getComponent('position');
    this.verletPointManager = world.getComponent('verletPoint');

    this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);

    // Pre-allocate staging buffer (Zero-Allocation policy)
    this.instanceData = new Float32Array(MAX_INSTANCES * INSTANCE_STRIDE);

    this.initBuffers();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  public render(_alpha: number): void {
    // 1. Clear Screen
    this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 2. Use Program
    this.gl.useProgram(this.program);

    // 3. Update Uniforms
    const uResolution = this.gl.getUniformLocation(this.program, "u_resolution");
    this.gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);

    // 4. Fill Instance Buffer (CPU)
    // We iterate over visible entities (those with verletPoint)
    // Optimization: Only iterate dense list of verletPoints.

    const count = this.verletPointManager.getCount();
    const activeEntities = this.verletPointManager.getDenseEntities();

    // Direct TypedArray access for maximum speed
    const positions = this.positionManager.getRawData(); // Stride 2 [x, y]
    const verletPoints = this.verletPointManager.getRawData(); // Stride 3 [radius, friction, isPinned]

    let instanceCount = 0;

    // Loop through entities
    for (let i = 0; i < count; i++) {
        if (instanceCount >= MAX_INSTANCES) break;

        const entityId = activeEntities[i];

        // Lookup position index using sparse map (O(1))
        // We use getIndex because entities might not be perfectly aligned if deletions occurred.
        const posIdx = this.positionManager.getIndex(entityId) * 2;

        // If entity has no position (rare but possible), skip
        if (posIdx < 0) continue;

        const x = positions[posIdx];
        const y = positions[posIdx + 1];

        // Optimized Access:
        const vpIdx = i * 3;
        const radius = verletPoints[vpIdx];
        const isPinned = verletPoints[vpIdx + 2];

        // Color Logic (Simple debug visualization)
        let r=0, g=1, b=1; // Cyan
        if (isPinned > 0.5) { r=1; g=0; b=0; } // Red for pinned

        // Fill Staging Buffer
        const offset = instanceCount * INSTANCE_STRIDE;
        this.instanceData[offset] = x;
        this.instanceData[offset + 1] = y;
        this.instanceData[offset + 2] = radius;
        this.instanceData[offset + 3] = r;
        this.instanceData[offset + 4] = g;
        this.instanceData[offset + 5] = b;

        instanceCount++;
    }

    if (instanceCount === 0) return;

    // 5. Upload Data to GPU
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
    // Use bufferSubData to update only the used portion of the buffer
    // This avoids reallocating the GPU buffer.
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, instanceCount * INSTANCE_STRIDE);

    // 6. Draw Instanced
    this.gl.bindVertexArray(this.vao);
    // Draw 6 vertices (2 triangles) per instance
    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, instanceCount);
  }

  private initBuffers(): void {
    this.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vao);

    // --- 1. Quad Geometry (Shared by all instances) ---
    // A unit quad centered at 0,0 with size 2x2 [-1, 1]
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);

    // Attribute 0: Quad Position (vec2)
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

    // --- 2. Instance Data (Dynamic VBO) ---
    this.instanceBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
    // Allocate max size on GPU once (STATIC/DYNAMIC DRAW)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);

    // Stride in bytes = 6 floats * 4 bytes
    const strideBytes = INSTANCE_STRIDE * 4;

    // Attribute 1: Instance Position (vec2)
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, strideBytes, 0);
    this.gl.vertexAttribDivisor(1, 1); // Advance once per instance

    // Attribute 2: Instance Radius (float)
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 1, this.gl.FLOAT, false, strideBytes, 2 * 4);
    this.gl.vertexAttribDivisor(2, 1);

    // Attribute 3: Instance Color (vec3)
    this.gl.enableVertexAttribArray(3);
    this.gl.vertexAttribPointer(3, 3, this.gl.FLOAT, false, strideBytes, 3 * 4);
    this.gl.vertexAttribDivisor(3, 1);

    this.gl.bindVertexArray(null);
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);

    const program = this.gl.createProgram();
    if (!program) throw new Error("Failed to create program");

    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) || "Unknown Link Error");
    }
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) || "Unknown Compile Error");
    }
    return shader;
  }
}
