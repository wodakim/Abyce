import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';
import { Position, PrevPosition, Acceleration, VerletPoint, FoodTag } from '../ecs/components';

export class SpawnerSystem {
  private world: World;
  private foodTagManager: ComponentManager<Uint8Array>;
  private bounds: { width: number; height: number };

  private targetFoodCount: number = 800; // Stress test target

  constructor(world: World, bounds: { width: number; height: number }) {
    this.world = world;
    this.foodTagManager = world.getComponent('foodTag');
    this.bounds = bounds;
  }

  update(_dt: number) {
    const currentCount = this.foodTagManager.getCount();

    if (currentCount < this.targetFoodCount) {
        const toSpawn = Math.min(10, this.targetFoodCount - currentCount); // Spawn 10 per frame max
        for (let i = 0; i < toSpawn; i++) {
            this.spawnFood();
        }
    }
  }

  private spawnFood() {
      const x = Math.random() * this.bounds.width;
      const y = Math.random() * this.bounds.height;
      const radius = 5 + Math.random() * 5; // 5-10 size

      const entity = this.world.createEntity();
      this.world.addComponent(entity, Position.name, [x, y]);
      this.world.addComponent(entity, PrevPosition.name, [x, y]); // Static initially
      this.world.addComponent(entity, Acceleration.name, [0, 0]);

      this.world.addComponent(entity, VerletPoint.name, [radius, 0.98, 0]); // Not pinned
      this.world.addComponent(entity, FoodTag.name, [1]);
  }
}
