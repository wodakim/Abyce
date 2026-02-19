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

  private readonly MAX_JOYSTICK_RADIUS = 50.0;
  private readonly FORCE_MULTIPLIER = 3000.0;
  private readonly FRICTION_FACTOR = 0.2;

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
    this.onTouchEnd = this.onTouchEnd.bind(this);

    // Mouse support for debugging
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    if (this.canvas) {
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd);
        this.canvas.addEventListener('touchcancel', this.onTouchEnd);

        // Debug mouse
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    }
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

  private onTouchEnd(e: TouchEvent) {
     if (e.touches.length === 0) {
         this.isDragging = false;
         this.inputX = 0;
         this.inputY = 0;
     }
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

  private onMouseUp(_e: MouseEvent) {
      if (this.isDragging) {
          this.isDragging = false;
          this.inputX = 0;
          this.inputY = 0;
      }
  }

  private updateInputVector(currentX: number, currentY: number) {
      let dx = currentX - this.originX;
      let dy = currentY - this.originY;

      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist > this.MAX_JOYSTICK_RADIUS) {
          const ratio = this.MAX_JOYSTICK_RADIUS / dist;
          dx *= ratio;
          dy *= ratio;
      }

      // Normalize to -1..1
      this.inputX = dx / this.MAX_JOYSTICK_RADIUS;
      this.inputY = dy / this.MAX_JOYSTICK_RADIUS;
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
            // Apply Friction (Viscosity)
            if (this.positionManager.has(entityId) && this.prevPositionManager.has(entityId)) {
                const posIdx = this.positionManager.getIndex(entityId) * 2;
                const prevIdx = this.prevPositionManager.getIndex(entityId) * 2;

                const px = positions[posIdx];
                const py = positions[posIdx + 1];
                let ppx = prevPositions[prevIdx];
                let ppy = prevPositions[prevIdx + 1];

                // Formula: prevPos += (pos - prevPos) * friction
                ppx += (px - ppx) * this.FRICTION_FACTOR;
                ppy += (py - ppy) * this.FRICTION_FACTOR;

                prevPositions[prevIdx] = ppx;
                prevPositions[prevIdx + 1] = ppy;
            }
        }
    }
  }
}
