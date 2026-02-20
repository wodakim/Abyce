import { System } from '../ecs/types';

export class RenderSystem extends System {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvasId: string) {
    super();
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.gl = this.canvas.getContext('webgl2');
    if (!this.gl) {
      console.error('WebGL 2.0 not supported');
      // Fallback or exit
    }
  }

  init(): void {
    if (!this.gl) return;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Handle resize
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    if (!this.gl) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  update(_dt: number): void {
    if (!this.gl) return;

    // Clear screen
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // TODO: Render entities
    // Iterate entities with RenderComponent and draw them
  }
}
