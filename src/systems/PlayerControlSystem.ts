// Player Control System

import { System } from '../ecs/types';
import { World } from '../ecs/World';
import { VerletBody, COMPONENT_VERLET_BODY, COMPONENT_PLAYER } from '../components/VerletBody';
import { InputSystem } from './InputSystem';

export class PlayerControlSystem extends System {
  private inputSystem: InputSystem;
  private force: number = 500; // Force strength

  constructor(inputSystem: InputSystem) {
    super();
    this.inputSystem = inputSystem;
  }

  update(dt: number): void {
    if (!this.world) return;

    // Get Input Vector (Normalized)
    const joystick = this.inputSystem.getJoystick();
    if (joystick.x === 0 && joystick.y === 0) return;

    const players = (this.world as World).getEntitiesWith([COMPONENT_PLAYER, COMPONENT_VERLET_BODY]);

    for (const entity of players) {
      const body = (this.world as World).getComponent<VerletBody>(entity, COMPONENT_VERLET_BODY);
      if (!body) continue;

      // Apply force to ALL points of the player to move the whole blob
      // Or just the center/pinned point?
      // Soft body movement feels better if force is applied distributed or to center.
      // Let's apply to all unpinned points for organic drag.

      const count = body.pointCount;
      const stride = VerletBody.STRIDE;
      const points = body.points;

      const fx = joystick.x * this.force * dt;
      const fy = joystick.y * this.force * dt;

      for (let i = 0; i < count; i++) {
        const idx = i * stride;

        // F = ma -> a = F/m. Let m=1.
        // Verlet: pos += velocity + acc * dt * dt
        // We modify position directly or "oldPosition" to add velocity?
        // Actually, adding to current position adds velocity in next step implicitly.
        // x_new = 2x - oldX + a*dt^2
        // To add force: x_new += force * dt * dt

        points[idx] += fx * dt;
        points[idx + 1] += fy * dt;
      }
    }
  }
}
