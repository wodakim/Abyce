export class GameLoop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private timeStep: number = 1000 / 60; // 60 FPS target for physics

  constructor(
    private updateFn: (dt: number) => void,
    private renderFn: (alpha: number) => void
  ) {
    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop(currentTime: number) {
    if (!this.isRunning) return;

    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap frame time to avoid spiral of death (e.g., if tab is backgrounded)
    if (frameTime > 250) {
      frameTime = 250;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= this.timeStep) {
      // Fixed update step (dt in seconds)
      this.updateFn(this.timeStep / 1000);
      this.accumulator -= this.timeStep;
    }

    const alpha = this.accumulator / this.timeStep;
    this.renderFn(alpha);

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
