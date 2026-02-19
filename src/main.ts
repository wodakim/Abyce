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
import { AudioSystem, audioSystem } from './core/audio/AudioSystem';
import { Serializer } from './core/io/Serializer';
import { Position, PrevPosition, Acceleration, VerletPoint, Constraint, PlayerTag, FoodTag, Color, DNA } from './core/ecs/components';

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
world.registerComponent(DNA.name, DNA.type, DNA.stride);

const bounds = { width: window.innerWidth, height: window.innerHeight };

const spatialHash = new SpatialHashGrid(bounds.width, bounds.height, 100);
const verletSystem = new VerletSystem(world, bounds, spatialHash);
const renderSystem = new RenderSystem(world, 'gameCanvas');
const inputSystem = new InputSystem(world, 'gameCanvas');
const spawnerSystem = new SpawnerSystem(world, bounds);
const predationSystem = new PredationSystem(world, spatialHash);
const nativeBridge = new NativeBridge();

// Audio Init on Click
window.addEventListener('click', () => {
    audioSystem.resume();
}, { once: true });

function createCell(centerX: number, centerY: number, radius: number, segments: number, isPlayer: boolean = false, dna: Float32Array | null = null) {
    const centerEntity = world.createEntity();
    world.addComponent(centerEntity, Position.name, [centerX, centerY]);

    world.getComponent(Position.name).add(centerEntity, [centerX, centerY]);
    world.getComponent(PrevPosition.name).add(centerEntity, [centerX, centerY]);
    world.getComponent(Acceleration.name).add(centerEntity, [0, 0]);
    world.getComponent(VerletPoint.name).add(centerEntity, [radius/2, 0.95, 0]);

    if (isPlayer) {
        world.getComponent(PlayerTag.name).add(centerEntity, [1]);

        let r=0, g=1, b=1;
        if (dna) {
            // Apply DNA: [speed, perceptionRadius, r, g, b, density]
            // We use color from DNA
            r = dna[2]; g = dna[3]; b = dna[4];
            world.getComponent(DNA.name).add(centerEntity, Array.from(dna)); // Copy DNA
        } else {
            // Default DNA
            const defaultDna = [1.0, 100, 0.0, 1.0, 1.0, 1.0];
            world.getComponent(DNA.name).add(centerEntity, defaultDna);
        }

        world.getComponent(Color.name).add(centerEntity, [r, g, b]);

        // Save DNA on start if not present? Or on death.
        // Let's verify persistence by saving initial state.
        const saved = {
            version: 1,
            gen: 1,
            dna: Serializer.encode(new Float32Array([1.0, 100, r, g, b, 1.0]))
        };
        // Don't overwrite if existing load was intended.
        // Serializer.saveToStorage('abyce_dev_save', saved);
    } else {
        world.getComponent(Color.name).add(centerEntity, [1.0, 0.2, 0.2]);
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
             // Inherit DNA color for rim
             const centerColor = world.getComponent<Float32Array>(Color.name).get(centerEntity);
             if (centerColor) {
                 world.getComponent(Color.name).add(segment, [centerColor[0], centerColor[1], centerColor[2]]);
             } else {
                 world.getComponent(Color.name).add(segment, [0.8, 1.0, 1.0]);
             }
        } else {
             world.getComponent(Color.name).add(segment, [1.0, 0.5, 0.5]);
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

// Logic: Check LocalStorage
const saveData = Serializer.loadFromStorage('abyce_dev_save');
let startDna: Float32Array | null = null;

if (saveData && saveData.dna) {
    console.log("Loading Save:", saveData);
    startDna = Serializer.decode(saveData.dna);
    // Mutate slightly on load? "Roguelite" loop.
    if (startDna) {
        startDna[2] = Math.random(); // Mutate R
        startDna[3] = Math.random(); // Mutate G
        startDna[4] = Math.random(); // Mutate B

        // Save next generation
        Serializer.saveToStorage('abyce_dev_save', {
            version: 1,
            gen: (saveData.gen || 1) + 1,
            dna: Serializer.encode(startDna)
        });
    }
} else {
    // Initial Save
    const initialDna = new Float32Array([1.0, 100, 0.0, 1.0, 1.0, 1.0]);
    Serializer.saveToStorage('abyce_dev_save', {
        version: 1,
        gen: 1,
        dna: Serializer.encode(initialDna)
    });
    startDna = initialDna;
}

createCell(window.innerWidth / 2, window.innerHeight / 2, 50, 12, true, startDna);

for(let i=0; i<3; i++) {
    createCell(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 20, 6, false);
}

let frameCount = 0;
let lastTime = performance.now();

const loop = new GameLoop(
  (dt) => {
    spawnerSystem.update(dt);
    inputSystem.update(dt);
    verletSystem.update(dt);
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
console.log("ABYCE Phase 5 Complete: Core Loop.");
