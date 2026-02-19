import './style.css';
import { World } from './core/ecs/World';
import { GameLoop } from './core/loop/GameLoop';
import { VerletSystem } from './core/physics/VerletSystem';
import { RenderSystem } from './core/rendering/RenderSystem';
import { InputSystem } from './core/systems/InputSystem';
import { SpawnerSystem } from './core/systems/SpawnerSystem';
import { PredationSystem } from './core/systems/PredationSystem';
import { SpatialHashGrid } from './core/physics/SpatialHashGrid';
import { NativeBridge } from './core/bridge/NativeBridge';
import { Position, PrevPosition, Acceleration, VerletPoint, Constraint, PlayerTag, FoodTag, Color } from './core/ecs/components';

import './ui/main';
import { uiEvents } from './ui/App';

const world = new World();

world.registerComponent(Position.name, Position.type, Position.stride);
world.registerComponent(PrevPosition.name, PrevPosition.type, PrevPosition.stride);
world.registerComponent(Acceleration.name, Acceleration.type, Acceleration.stride);
world.registerComponent(VerletPoint.name, VerletPoint.type, VerletPoint.stride);
world.registerComponent(Constraint.name, Constraint.type, Constraint.stride);
world.registerComponent(PlayerTag.name, PlayerTag.type, PlayerTag.stride);
world.registerComponent(FoodTag.name, FoodTag.type, FoodTag.stride);
world.registerComponent(Color.name, Color.type, Color.stride);

const bounds = { width: window.innerWidth, height: window.innerHeight };

const spatialHash = new SpatialHashGrid(bounds.width, bounds.height, 100);
const verletSystem = new VerletSystem(world, bounds, spatialHash); // Pass grid
const renderSystem = new RenderSystem(world, 'gameCanvas');
const inputSystem = new InputSystem(world, 'gameCanvas');
const spawnerSystem = new SpawnerSystem(world, bounds);
const predationSystem = new PredationSystem(world, spatialHash);
const nativeBridge = new NativeBridge();

function createCell(centerX: number, centerY: number, radius: number, segments: number, isPlayer: boolean = false) {
    const centerEntity = world.createEntity();
    world.addComponent(centerEntity, Position.name, [centerX, centerY]);

    world.getComponent(Position.name).add(centerEntity, [centerX, centerY]);
    world.getComponent(PrevPosition.name).add(centerEntity, [centerX, centerY]);
    world.getComponent(Acceleration.name).add(centerEntity, [0, 0]);
    world.getComponent(VerletPoint.name).add(centerEntity, [radius/2, 0.95, 0]);

    if (isPlayer) {
        world.getComponent(PlayerTag.name).add(centerEntity, [1]);
        world.getComponent(Color.name).add(centerEntity, [0.0, 1.0, 1.0]); // Cyan Center
    } else {
        world.getComponent(Color.name).add(centerEntity, [1.0, 0.2, 0.2]); // Red Enemy Center
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
        world.getComponent(VerletPoint.name).add(segment, [5, 0.9, 0]);

        if (isPlayer) {
             world.getComponent(Color.name).add(segment, [0.8, 1.0, 1.0]); // White/Cyan-ish Rim
        } else {
             world.getComponent(Color.name).add(segment, [1.0, 0.5, 0.5]); // Reddish Rim
        }

        const constraint1 = world.createEntity();
        world.getComponent(Constraint.name).add(constraint1, [centerEntity, segment, radius, 0.05]);

        segmentEntities.push(segment);
    }

    for (let i = 0; i < segments; i++) {
        const current = segmentEntities[i];
        const next = segmentEntities[(i + 1) % segments];

        const dx = Math.cos(i * angleStep) * radius - Math.cos((i+1) * angleStep) * radius;
        const dy = Math.sin(i * angleStep) * radius - Math.sin((i+1) * angleStep) * radius;
        const dist = Math.sqrt(dx*dx + dy*dy);

        const constraint2 = world.createEntity();
        world.getComponent(Constraint.name).add(constraint2, [current, next, dist, 0.8]);
    }
}

createCell(window.innerWidth / 2, window.innerHeight / 2, 50, 12, true);

for(let i=0; i<3; i++) {
    createCell(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 20, 6, false);
}

let frameCount = 0;
let lastTime = performance.now();

const loop = new GameLoop(
  (dt) => {
    spawnerSystem.update(dt);
    inputSystem.update(dt);
    verletSystem.update(dt); // Grid updated here? Need to sync.
    // NOTE: VerletSystem now uses Grid. It should populate grid if run first.
    predationSystem.update(dt);

    if (frameCount % 60 === 0) {
        const playerEntities = world.getComponent<Uint8Array>(PlayerTag.name).getDenseEntities();
        if (playerEntities.length > 0) {
             const pid = playerEntities[0];
             const rad = world.getComponent<Float32Array>(VerletPoint.name).get(pid);
             if (rad) {
                 uiEvents.dispatchEvent(new CustomEvent('score-update', { detail: rad[0] }));
             }
        }
    }
  },
  (alpha) => {
    renderSystem.render(alpha);

    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        const fps = frameCount;
        uiEvents.dispatchEvent(new CustomEvent('fps-update', { detail: fps }));
        frameCount = 0;
        lastTime = now;
    }
  }
);

loop.start();
nativeBridge.sendMessage("game_started");
console.log("ABYCE Phase 4 Polish Complete.");
