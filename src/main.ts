import './style.css';
import { World } from './core/ecs/World';
import { GameLoop } from './core/loop/GameLoop';
import { VerletSystem } from './core/physics/VerletSystem';
import { RenderSystem } from './core/rendering/RenderSystem';
import { InputSystem } from './core/systems/InputSystem';
import { SpawnerSystem } from './core/systems/SpawnerSystem';
import { PredationSystem } from './core/systems/PredationSystem';
import { SpatialHashGrid } from './core/physics/SpatialHashGrid';
import { Position, PrevPosition, Acceleration, VerletPoint, Constraint, PlayerTag, FoodTag } from './core/ecs/components';

// Initialize ECS
const world = new World();

// Register Components
world.registerComponent(Position.name, Position.type, Position.stride);
world.registerComponent(PrevPosition.name, PrevPosition.type, PrevPosition.stride);
world.registerComponent(Acceleration.name, Acceleration.type, Acceleration.stride);
world.registerComponent(VerletPoint.name, VerletPoint.type, VerletPoint.stride);
world.registerComponent(Constraint.name, Constraint.type, Constraint.stride);
world.registerComponent(PlayerTag.name, PlayerTag.type, PlayerTag.stride);
world.registerComponent(FoodTag.name, FoodTag.type, FoodTag.stride);

// Initialize Systems
const bounds = { width: window.innerWidth, height: window.innerHeight };

const spatialHash = new SpatialHashGrid(bounds.width, bounds.height, 100);
const verletSystem = new VerletSystem(world, bounds);
const renderSystem = new RenderSystem(world, 'gameCanvas');
const inputSystem = new InputSystem(world, 'gameCanvas');
const spawnerSystem = new SpawnerSystem(world, bounds);
const predationSystem = new PredationSystem(world, spatialHash);

// --- Helper: Create a Verlet Cell ---
function createCell(centerX: number, centerY: number, radius: number, segments: number, isPlayer: boolean = false) {
    const centerEntity = world.createEntity();
    world.addComponent(centerEntity, Position.name, [centerX, centerY]);

    // Position, PrevPosition, Acceleration
    world.getComponent(Position.name).add(centerEntity, [centerX, centerY]);
    world.getComponent(PrevPosition.name).add(centerEntity, [centerX, centerY]);
    world.getComponent(Acceleration.name).add(centerEntity, [0, 0]);
    world.getComponent(VerletPoint.name).add(centerEntity, [radius/2, 0.95, 0]);

    if (isPlayer) {
        world.getComponent(PlayerTag.name).add(centerEntity, [1]);
    }

    const segmentEntities = [];
    const angleStep = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i++) {
        const angle = i * angleStep;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const segment = world.createEntity();
        world.getComponent(Position.name).add(segment, [x, y]);
        world.getComponent(PrevPosition.name).add(segment, [x, y]);
        world.getComponent(Acceleration.name).add(segment, [0, 0]);
        // Friction 0.9 for drag
        world.getComponent(VerletPoint.name).add(segment, [5, 0.9, 0]);

        // Constraint to Center
        const constraint1 = world.createEntity();
        world.getComponent(Constraint.name).add(constraint1, [centerEntity, segment, radius, 0.05]);

        segmentEntities.push(segment);
    }

    // Constraints between segments (Membrane)
    for (let i = 0; i < segments; i++) {
        const current = segmentEntities[i];
        const next = segmentEntities[(i + 1) % segments];

        // Distance between segments
        const dx = Math.cos(i * angleStep) * radius - Math.cos((i+1) * angleStep) * radius;
        const dy = Math.sin(i * angleStep) * radius - Math.sin((i+1) * angleStep) * radius;
        const dist = Math.sqrt(dx*dx + dy*dy);

        const constraint2 = world.createEntity();
        world.getComponent(Constraint.name).add(constraint2, [current, next, dist, 0.8]);
    }
}

// Spawn Player Cell
createCell(window.innerWidth / 2, window.innerHeight / 2, 50, 12, true);

// Spawn some dummy cells (Competitors? Or just floating debris)
// Let's spawn smaller cells that can be eaten
for(let i=0; i<3; i++) {
    createCell(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 20, 6, false);
}

// Game Loop
const loop = new GameLoop(
  (dt) => {
    spawnerSystem.update(dt);
    inputSystem.update(dt);
    verletSystem.update(dt);
    predationSystem.update(dt); // Updates Grid and eats
  },
  (alpha) => {
    renderSystem.render(alpha);
  }
);

loop.start();
console.log("ABYCE Phase 3 Started: Mass Simulation.");
