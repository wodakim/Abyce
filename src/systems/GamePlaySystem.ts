// Gameplay System (Eating, Spawning, Growing)

import { System } from '../ecs/types';
import { World } from '../ecs/World';
import { VerletBody, COMPONENT_VERLET_BODY, COMPONENT_PLAYER, COMPONENT_FOOD, FoodComponent } from '../components/VerletBody';

export class GamePlaySystem extends System {
  private spawnTimer: number = 0;
  private spawnInterval: number = 2.0; // Seconds between food spawn
  private maxFood: number = 50;
  private score: number = 0;

  constructor() {
    super();
  }

  update(dt: number): void {
    if (!this.world) return;

    // Spawning Logic
    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnFood();
    }

    // Collision Logic (Eating)
    // Optimization: Use spatial hash in future. Naive O(N*M) for now.
    const players = (this.world as World).getEntitiesWith([COMPONENT_PLAYER, COMPONENT_VERLET_BODY]);
    const foods = (this.world as World).getEntitiesWith([COMPONENT_FOOD, COMPONENT_VERLET_BODY]);

    for (const player of players) {
      const pBody = (this.world as World).getComponent<VerletBody>(player, COMPONENT_VERLET_BODY);
      if (!pBody) continue;

      // Get player center (approximate)
      let px = 0, py = 0;
      for (let i = 0; i < pBody.pointCount; i++) {
        px += pBody.points[i * VerletBody.STRIDE];
        py += pBody.points[i * VerletBody.STRIDE + 1];
      }
      px /= pBody.pointCount;
      py /= pBody.pointCount;

      // Check collision with food
      for (const food of foods) {
        const fBody = (this.world as World).getComponent<VerletBody>(food, COMPONENT_VERLET_BODY);
        if (!fBody || fBody.pointCount === 0) continue;

        // Food is usually 1 point
        const fx = fBody.points[0];
        const fy = fBody.points[1];
        const fr = fBody.points[4]; // Radius

        // Distance check
        const dist = Math.hypot(px - fx, py - fy);
        const pRadius = 20; // Approx player radius

        if (dist < pRadius + fr) {
          this.eatFood(food);
        }
      }
    }
  }

  private spawnFood(): void {
    const world = this.world as World;
    // Check count
    const foods = world.getEntitiesWith([COMPONENT_FOOD]);
    if (foods.length >= this.maxFood) return;

    const id = world.createEntity();
    if (id === -1) return;

    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;

    const body = new VerletBody();
    body.addPoint(x, y, 5 + Math.random() * 5);
    world.addComponent(id, body);

    const foodComp = new FoodComponent();
    world.addComponent(id, foodComp);
  }

  private eatFood(foodEntity: number): void {
    const world = this.world as World;
    const foodComp = world.getComponent<FoodComponent>(foodEntity, COMPONENT_FOOD);

    // Update Score
    this.score += foodComp ? foodComp.value : 10;

    // Dispatch Event for UI
    window.dispatchEvent(new CustomEvent('abyce-score', { detail: this.score }));

    // Destroy Food
    world.destroyEntity(foodEntity);

    // Grow Player? (Increase radius of points or add points)
    // For now just score.
  }
}
