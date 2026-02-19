import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';

export class InputSystem {
  private accelerationManager: ComponentManager<Float32Array>;
  private playerTagManager: ComponentManager<Uint8Array>;
  private positionManager: ComponentManager<Float32Array>;
  private prevPositionManager: ComponentManager<Float32Array>;

  // Joystick State
  private isDragging: boolean = false;
  private originX: number = 0;
  private originY: number = 0;
  private inputX: number = 0;
  private inputY: number = 0;

  // Constants
  // Force reduced from 3000 to 100 per user request
  private readonly FORCE_MULTIPLIER = 100.0;
  // Friction increased to 0.8 for aggressive braking (viscous fluid)
  private readonly FRICTION_FACTOR = 0.8;

  private canvas: HTMLCanvasElement | null;

  constructor(world: World, canvasId: string) {
    this.accelerationManager = world.getComponent('acceleration');
    this.playerTagManager = world.getComponent('playerTag');
    this.positionManager = world.getComponent('position');
    this.prevPositionManager = world.getComponent('prevPosition');

    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    // Bind events
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onInputEnd = this.onInputEnd.bind(this);

    // Mouse support for debugging
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    // onInputEnd handles mouseup and mouseleave as well

    if (this.canvas) {
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });

        // End events
        this.canvas.addEventListener('touchend', this.onInputEnd);
        this.canvas.addEventListener('touchcancel', this.onInputEnd);

        // Debug mouse - Attached to canvas as requested
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
     // For touch events, we can check touches.length but strictly we just reset on any end/cancel
     // For mouse events, it's a simple trigger.
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

      // Strict Normalization: Input must be a unit vector (-1 to 1)
      // Do NOT use distance as magnitude.
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

    const accelerations = this.accelerationManager.getRawData();
    const positions = this.positionManager.getRawData();
    const prevPositions = this.prevPositionManager.getRawData();

    for (let i = 0; i < count; i++) {
        const entityId = activePlayers[i];

        if (this.isDragging) {
            // Apply Force
            if (this.accelerationManager.has(entityId)) {
                const accIdx = this.accelerationManager.getIndex(entityId) * 2;
                accelerations[accIdx] += this.inputX * this.FORCE_MULTIPLIER;
                accelerations[accIdx + 1] += this.inputY * this.FORCE_MULTIPLIER;
            }
        } else {
            // Apply Aggressive Friction (Viscosity)
            if (this.positionManager.has(entityId) && this.prevPositionManager.has(entityId)) {
                const posIdx = this.positionManager.getIndex(entityId) * 2;
                const prevIdx = this.prevPositionManager.getIndex(entityId) * 2;

                const px = positions[posIdx];
                const py = positions[posIdx + 1];
                let ppx = prevPositions[prevIdx];
                let ppy = prevPositions[prevIdx + 1];

                // Formula: prevPos += (pos - prevPos) * friction
                // Friction 0.8 means ppx moves 80% towards px.
                // This reduces velocity (px - ppx) to 20% of its original value per frame.
                ppx += (px - ppx) * this.FRICTION_FACTOR;
                ppy += (py - ppy) * this.FRICTION_FACTOR;

                prevPositions[prevIdx] = ppx;
                prevPositions[prevIdx + 1] = ppy;
            }
        }
    }
  }
}
