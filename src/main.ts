import { World } from './core/ecs/World';
import { GameLoop } from './core/loop/GameLoop';
import { ComponentManager } from './core/ecs/ComponentManager';

// --- Zero-Allocation Check ---
// We will spawn entities and update them, ensuring no garbage is created.

const world = new World();

// Register components with TypedArray constructors
world.registerComponent('position', Float32Array);
world.registerComponent('velocity', Float32Array);

// Pre-allocate entities
const MAX_ENTITIES = 5000;
const entityIds = new Int32Array(MAX_ENTITIES);

for (let i = 0; i < MAX_ENTITIES; i++) {
  const entity = world.createEntity();
  entityIds[i] = entity;
  // Test adding components
  world.addComponent(entity, 'position', 0);
  world.addComponent(entity, 'velocity', 1.5);
}

console.log(`Spawned ${MAX_ENTITIES} entities with components.`);

// Simple update system (mock)
function updateSystem(dt: number) {
  // Get component managers
  const posManager = world.getComponent('position') as ComponentManager<Float32Array>;
  const velManager = world.getComponent('velocity') as ComponentManager<Float32Array>;

  // Use dense iteration for maximum performance (DOD)
  // getDenseEntities returns the RAW Int32Array, not a copy or view.
  const activeEntities = posManager.getDenseEntities();
  const count = posManager.getCount();

  // Direct data access (TypedArrays)
  const positions = posManager.getRawData();

  for (let i = 0; i < count; i++) {
     const entityId = activeEntities[i];

     // Optimized check:
     // Velocity is just a number here, but in real ECS components might be structs.

     const vel = velManager.get(entityId); // O(1) lookup
     if (vel !== undefined) {
         positions[i] += vel * dt; // Direct write to Float32Array
     }
  }
}

// Game Loop
const loop = new GameLoop(
  (dt) => {
    updateSystem(dt);
  },
  (_alpha) => {
    // Render
  }
);

loop.start();

// After a few seconds, stop and check if we crashed or had major GC spikes (manual verification in browser profiler would be next step)
setTimeout(() => {
  loop.stop();
  console.log("Loop ran successfully for 2 seconds.");
}, 2000);
