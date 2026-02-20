import { System } from '../ecs/types';

export class InputSystem extends System {
  private canvas: HTMLCanvasElement;
  private isPointerDown: boolean = false;

  // Joystick Logic
  private joystickOrigin = { x: 0, y: 0 };
  private joystickCurrent = { x: 0, y: 0 };
  private joystickVector = { x: 0, y: 0 }; // Normalized -1 to 1
  private maxDragDistance = 50;

  constructor(canvasId: string) {
    super();
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }
    this.initListeners();
  }

  private initListeners(): void {
    const start = (x: number, y: number) => {
      this.isPointerDown = true;
      this.joystickOrigin = { x, y };
      this.joystickCurrent = { x, y };
      this.updateJoystickVector();
    };

    const move = (x: number, y: number) => {
      if (!this.isPointerDown) return;
      this.joystickCurrent = { x, y };
      this.updateJoystickVector();
    };

    const end = () => {
      this.isPointerDown = false;
      this.joystickVector = { x: 0, y: 0 };
    };

    // Mouse
    this.canvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', end);
    this.canvas.addEventListener('mouseleave', end);

    // Touch
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      start(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      move(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      end();
    });
  }

  private updateJoystickVector(): void {
    const dx = this.joystickCurrent.x - this.joystickOrigin.x;
    const dy = this.joystickCurrent.y - this.joystickOrigin.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      const cap = Math.min(dist, this.maxDragDistance);
      this.joystickVector.x = (dx / dist) * (cap / this.maxDragDistance);
      this.joystickVector.y = (dy / dist) * (cap / this.maxDragDistance);
    } else {
      this.joystickVector = { x: 0, y: 0 };
    }
  }

  update(_dt: number): void {
    // No-op, state is updated via events
  }

  getJoystick(): { x: number, y: number } {
    return this.joystickVector;
  }
}
