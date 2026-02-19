import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';

export class InputSystem {
  // Use Velocity-based control (PrevPosition manipulation) instead of Acceleration
  private positionManager: ComponentManager<Float32Array>;
  private prevPositionManager: ComponentManager<Float32Array>;
  private playerTagManager: ComponentManager<Uint8Array>;

  // Joystick State
  private isDragging: boolean = false;
  private originX: number = 0;
  private originY: number = 0;
  private inputX: number = 0;
  private inputY: number = 0;

  // ARCADE PHYSICS CONSTANTS
  private readonly MAX_SPEED = 2.5; // Units per frame (approx 150px/sec at 60fps)
  private readonly ACCEL_FACTOR = 0.15; // 15% blend towards target velocity per frame (Responsive but smooth)
  private readonly BRAKE_FACTOR = 0.3; // 30% reduction of velocity per frame when releasing (Fast stop)

  private canvas: HTMLCanvasElement | null;

  constructor(world: World, canvasId: string) {
    this.positionManager = world.getComponent('position');
    this.prevPositionManager = world.getComponent('prevPosition');
    this.playerTagManager = world.getComponent('playerTag');

    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    // Bind events
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onInputEnd = this.onInputEnd.bind(this);

    // Mouse support
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    if (this.canvas) {
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.onInputEnd);
        this.canvas.addEventListener('touchcancel', this.onInputEnd);

        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseup', this.onInputEnd);
        this.canvas.addEventListener('mouseleave', this.onInputEnd);
    }
  }

  private resetInput() {
      this.isDragging = false;
      this.inputX = 0;
      this.inputY = 0;
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (!this.isDragging && e.touches.length > 0) {
        this.isDragging = true;
        this.originX = e.touches[0].clientX;
        this.originY = e.touches[0].clientY;
        this.inputX = 0;
        this.inputY = 0;
    }
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (this.isDragging && e.touches.length > 0) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        this.updateInputVector(currentX, currentY);
    }
  }

  private onInputEnd(_e: Event) {
     this.resetInput();
  }

  private onMouseDown(e: MouseEvent) {
      if (!this.isDragging) {
          this.isDragging = true;
          this.originX = e.clientX;
          this.originY = e.clientY;
          this.inputX = 0;
          this.inputY = 0;
      }
  }

  private onMouseMove(e: MouseEvent) {
      if (this.isDragging) {
          this.updateInputVector(e.clientX, e.clientY);
      }
  }

  private updateInputVector(currentX: number, currentY: number) {
      const dx = currentX - this.originX;
      const dy = currentY - this.originY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // Strict Normalization
      if (dist > 0.001) {
          this.inputX = dx / dist;
          this.inputY = dy / dist;
      } else {
          this.inputX = 0;
          this.inputY = 0;
      }
  }

  update(_dt: number) {
    const activePlayers = this.playerTagManager.getDenseEntities();
    const count = activePlayers.length;

    if (count === 0) return;

    const positions = this.positionManager.getRawData();
    const prevPositions = this.prevPositionManager.getRawData();

    for (let i = 0; i < count; i++) {
        const entityId = activePlayers[i];

        if (!this.positionManager.has(entityId) || !this.prevPositionManager.has(entityId)) continue;

        const posIdx = this.positionManager.getIndex(entityId) * 2;
        const prevIdx = this.prevPositionManager.getIndex(entityId) * 2;

        const px = positions[posIdx];
        const py = positions[posIdx + 1];
        const ppx = prevPositions[prevIdx];
        const ppy = prevPositions[prevIdx + 1];

        // 1. Calculate Current Velocity
        const currentVelX = px - ppx;
        const currentVelY = py - ppy;

        // 2. Calculate Target Velocity
        let targetVelX = 0;
        let targetVelY = 0;

        if (this.isDragging) {
            targetVelX = this.inputX * this.MAX_SPEED;
            targetVelY = this.inputY * this.MAX_SPEED;

            // Lerp towards target velocity (Arcade responsiveness)
            const newVelX = currentVelX + (targetVelX - currentVelX) * this.ACCEL_FACTOR;
            const newVelY = currentVelY + (targetVelY - currentVelY) * this.ACCEL_FACTOR;

            // Apply Velocity: Set PrevPos = Pos - NewVel
            prevPositions[prevIdx] = px - newVelX;
            prevPositions[prevIdx + 1] = py - newVelY;
        } else {
            // Braking Logic (Decay velocity towards 0)
            const newVelX = currentVelX * (1.0 - this.BRAKE_FACTOR);
            const newVelY = currentVelY * (1.0 - this.BRAKE_FACTOR);

            // If very slow, snap to stop to prevent micro-drift
            if (Math.abs(newVelX) < 0.01 && Math.abs(newVelY) < 0.01) {
                prevPositions[prevIdx] = px; // Stop: prev = current
                prevPositions[prevIdx + 1] = py;
            } else {
                prevPositions[prevIdx] = px - newVelX;
                prevPositions[prevIdx + 1] = py - newVelY;
            }
        }
    }
  }
}
