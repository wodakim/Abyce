export class GameLoop {
  private lastTime: number = 0;
  private accumulatedTime: number = 0;
  private isRunning: boolean = false;
  private readonly targetFPS: number = 60;
  private readonly fixedStep: number = 1000 / this.targetFPS;
  private updateCallback: (dt: number) => void;
  private renderCallback: () => void;
  private frameId: number = 0;

  constructor(update: (dt: number) => void, render: () => void) {
    this.updateCallback = update;
    this.renderCallback = render;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;
    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulatedTime += deltaTime;

    // Prevent spiral of death
    if (this.accumulatedTime > 1000) {
      this.accumulatedTime = this.fixedStep;
    }

    while (this.accumulatedTime >= this.fixedStep) {
      this.updateCallback(this.fixedStep / 1000); // Pass seconds
      this.accumulatedTime -= this.fixedStep;
    }

    this.renderCallback();

    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }
}
