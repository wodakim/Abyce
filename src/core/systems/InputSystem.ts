import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';

export class InputSystem {
  private accelerationManager: ComponentManager<Float32Array>;
  private playerTagManager: ComponentManager<Uint8Array>;
  private positionManager: ComponentManager<Float32Array>;

  // Input State
  private targetX: number = 0;
  private targetY: number = 0;
  private isTouching: boolean = false;

  private canvas: HTMLCanvasElement | null;

  constructor(world: World, canvasId: string) {
    this.accelerationManager = world.getComponent('acceleration');
    this.playerTagManager = world.getComponent('playerTag');
    this.positionManager = world.getComponent('position');

    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
        console.warn("InputSystem: Canvas not found. Input will not work.");
    }

    // Bind events
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseMove(e: MouseEvent) {
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    this.isTouching = true;
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.targetX = e.touches[0].clientX;
      this.targetY = e.touches[0].clientY;
      this.isTouching = true;
    }
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.targetX = e.touches[0].clientX;
      this.targetY = e.touches[0].clientY;
      this.isTouching = true;
    }
  }

  private onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        this.isTouching = false;
      }
  }

  update(_dt: number) {
    if (!this.isTouching) return;

    // Apply force to player entities
    const activePlayers = this.playerTagManager.getDenseEntities();
    const count = this.playerTagManager.getCount();

    const positions = this.positionManager.getRawData();
    const accelerations = this.accelerationManager.getRawData();

    // Constant force magnitude
    // Make force proportional to distance?
    const force = 5000;

    for (let i = 0; i < count; i++) {
        const entityId = activePlayers[i];

        // Get position of player
        if (!this.positionManager.has(entityId)) continue;

        const posIdx = this.positionManager.getIndex(entityId) * 2;
        const x = positions[posIdx];
        const y = positions[posIdx + 1];

        // Calculate vector to target
        const dx = this.targetX - x;
        const dy = this.targetY - y;

        const distSq = dx*dx + dy*dy;
        if (distSq < 100) continue; // Close enough

        const dist = Math.sqrt(distSq);

        // Normalize
        const nx = dx / dist;
        const ny = dy / dist;

        // Apply force to acceleration
        if (!this.accelerationManager.has(entityId)) continue;

        const accIdx = this.accelerationManager.getIndex(entityId) * 2;
        accelerations[accIdx] += nx * force;
        accelerations[accIdx + 1] += ny * force;
    }
  }
}
