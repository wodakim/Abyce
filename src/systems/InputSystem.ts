import { System } from '../ecs/types';

export class InputSystem extends System {
  private canvas: HTMLCanvasElement;
  private pointerX: number = 0;
  private pointerY: number = 0;
  private isPointerDown: boolean = false;
  private touches: Map<number, { x: number, y: number }> = new Map();

  constructor(canvasId: string) {
    super();
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.initListeners();
  }

  private initListeners(): void {
    // Mouse
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    // Touch
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isPointerDown = true;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPointerDown) {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    }
  }

  private handleMouseUp(): void {
    this.isPointerDown = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }
    this.isPointerDown = true;
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (this.touches.has(touch.identifier)) {
        this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
        // Update main pointer for single-touch logic
        this.pointerX = touch.clientX;
        this.pointerY = touch.clientY;
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touches.delete(e.changedTouches[i].identifier);
    }
    if (this.touches.size === 0) {
      this.isPointerDown = false;
    }
  }

  update(_dt: number): void {
    // TODO: Update InputComponent of the player entity
    // const player = this.world.getPlayerEntity();
    // if (player) { ... }
  }

  getPointerPosition(): { x: number, y: number } {
    return { x: this.pointerX, y: this.pointerY };
  }
}
