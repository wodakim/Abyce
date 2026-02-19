// src/core/rendering/RenderSystem.ts
import { ComponentManager } from '../ecs/ComponentManager';

import { World } from '../ecs/World';
import { vertexShaderSource, fragmentShaderSource, ppVertexShader, ppFragmentShader } from './shaders';

// Constants
const MAX_INSTANCES = 10000;
const INSTANCE_STRIDE = 6; // x, y, radius, r, g, b (6 floats)

export class RenderSystem {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  private particleProgram: WebGLProgram;
  private postProcessProgram: WebGLProgram;

  // Component Managers
  private positionManager: ComponentManager<Float32Array>;
  private verletPointManager: ComponentManager<Float32Array>;
  private colorManager: ComponentManager<Float32Array>;
  private cameraManager: ComponentManager<Float32Array>;

  // WebGL Objects
  private vao: WebGLVertexArrayObject | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private instanceBuffer: WebGLBuffer | null = null;

  // Framebuffer for Metaballs
  private fbo: WebGLFramebuffer | null = null;
  private fboTexture: WebGLTexture | null = null;
  private ppVao: WebGLVertexArrayObject | null = null;

  // CPU Buffers
  private instanceData: Float32Array;

  constructor(world: World, canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error(`Canvas with id "${canvasId}" not found`);

    const gl = this.canvas.getContext('webgl2', { alpha: true });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.positionManager = world.getComponent('position');
    this.verletPointManager = world.getComponent('verletPoint');
    this.colorManager = world.getComponent('color');
    this.cameraManager = world.getComponent('cameraData');

    this.particleProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
    this.postProcessProgram = this.createProgram(ppVertexShader, ppFragmentShader);

    this.instanceData = new Float32Array(MAX_INSTANCES * INSTANCE_STRIDE);

    this.initBuffers();
    this.initFramebuffer();
    this.initPostProcess();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Resize Texture
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  private initFramebuffer() {
      this.fbo = this.gl.createFramebuffer();
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);

      this.fboTexture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboTexture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.fboTexture, 0);

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  private initPostProcess() {
      this.ppVao = this.gl.createVertexArray();
      this.gl.bindVertexArray(this.ppVao);

      const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
      const buf = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVerts, this.gl.STATIC_DRAW);

      this.gl.enableVertexAttribArray(0);
      this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

      this.gl.bindVertexArray(null);
  }

  public render(_alpha: number): void {
    // 1. Bind Framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 2. Enable Additive Blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);

    this.gl.useProgram(this.particleProgram);

    const uResolution = this.gl.getUniformLocation(this.particleProgram, "u_resolution");
    this.gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);

    // Camera Uniforms
    let camX = 0;
    let camY = 0;
    let zoom = 1.0;

    const cameraEntities = this.cameraManager.getDenseEntities();
    if (cameraEntities.length > 0) {
        const camId = cameraEntities[0];
        const idx = this.cameraManager.getIndex(camId) * 4;
        const camData = this.cameraManager.getRawData();
        camX = camData[idx];
        camY = camData[idx + 1];
        zoom = camData[idx + 2];
    }

    const uCamera = this.gl.getUniformLocation(this.particleProgram, "u_camera");
    this.gl.uniform2f(uCamera, camX, camY);

    const uZoom = this.gl.getUniformLocation(this.particleProgram, "u_zoom");
    this.gl.uniform1f(uZoom, zoom);

    // 3. Fill Instance Buffer
    const count = this.verletPointManager.getCount();
    const activeEntities = this.verletPointManager.getDenseEntities();

    const positions = this.positionManager.getRawData();
    const verletPoints = this.verletPointManager.getRawData();
    const colors = this.colorManager.getRawData();

    let instanceCount = 0;

    for (let i = 0; i < count; i++) {
        if (instanceCount >= MAX_INSTANCES) break;

        const entityId = activeEntities[i];

        const posIdx = this.positionManager.getIndex(entityId) * 2;
        if (posIdx < 0) continue;

        const x = positions[posIdx];
        const y = positions[posIdx + 1];

        const vpIdx = i * 3;
        const radius = verletPoints[vpIdx];

        // Color Lookup
        let r=0, g=1, b=1; // Default Cyan
        if (this.colorManager.has(entityId)) {
            const cIdx = this.colorManager.getIndex(entityId) * 3;
            r = colors[cIdx];
            g = colors[cIdx + 1];
            b = colors[cIdx + 2];
        }

        const offset = instanceCount * INSTANCE_STRIDE;
        this.instanceData[offset] = x;
        this.instanceData[offset + 1] = y;
        this.instanceData[offset + 2] = radius;
        this.instanceData[offset + 3] = r;
        this.instanceData[offset + 4] = g;
        this.instanceData[offset + 5] = b;

        instanceCount++;
    }

    if (instanceCount > 0) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, instanceCount * INSTANCE_STRIDE);

        this.gl.bindVertexArray(this.vao);
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, instanceCount);
        this.gl.bindVertexArray(null);
    }

    // 4. Post-Process Pass
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.useProgram(this.postProcessProgram);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fboTexture);

    this.gl.bindVertexArray(this.ppVao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.bindVertexArray(null);
  }

  private initBuffers(): void {
    this.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vao);

    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    this.quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);

    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

    this.instanceBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);

    const strideBytes = INSTANCE_STRIDE * 4;

    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, strideBytes, 0);
    this.gl.vertexAttribDivisor(1, 1);

    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 1, this.gl.FLOAT, false, strideBytes, 2 * 4);
    this.gl.vertexAttribDivisor(2, 1);

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
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) throw new Error(this.gl.getProgramInfoLog(program) || "");
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) throw new Error(this.gl.getShaderInfoLog(shader) || "");
    return shader;
  }
}
