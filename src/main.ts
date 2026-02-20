import { GameLoop } from './core/GameLoop';
import { World } from './ecs/World';
import { RenderSystem } from './systems/RenderSystem';
import { InputSystem } from './systems/InputSystem';
import { VerletSystem } from './systems/VerletSystem';
import { PlayerControlSystem } from './systems/PlayerControlSystem';
import { GamePlaySystem } from './systems/GamePlaySystem';
import { NetworkMonitor } from './core/NetworkMonitor';
import { NativeBridge } from './bridge/NativeBridge';
import { VerletBody, PlayerComponent } from './components/VerletBody';
import './ui/index'; // Initialize React UI

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  console.log('ABYCE Engine Initializing...');

  const world = new World();
  const renderSystem = new RenderSystem('game-canvas');
  const inputSystem = new InputSystem('game-canvas');
  const verletSystem = new VerletSystem();
  const playerControlSystem = new PlayerControlSystem(inputSystem);
  const gamePlaySystem = new GamePlaySystem();

  // Register Systems (Order matters for Logic -> Physics -> Render)
  world.registerSystem(inputSystem);
  world.registerSystem(playerControlSystem);
  world.registerSystem(gamePlaySystem);
  world.registerSystem(verletSystem);
  // RenderSystem is manually called in render loop, but can be registered if it has update logic (like animation)

  renderSystem.init();

  // Initialize Player Entity
  const player = world.createEntity();
  const pBody = new VerletBody();

  // Create a soft body (Pentagon shape)
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const radius = 30;

  // Center point
  const centerIdx = pBody.addPoint(cx, cy, radius, false);

  // Outer points
  const sides = 5;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    pBody.addPoint(x, y, 10);

    // Connect to center (Spokes)
    pBody.addConstraint(centerIdx, i + 1, 0.1);

    // Connect to neighbor (Perimeter)
    // Note: indices are 1-based for outer points here since 0 is center
    // Wait, indices returned by addPoint are sequential.
    // Center is 0. Outer are 1, 2, 3, 4, 5.
    // Neighbors: 1-2, 2-3, 3-4, 4-5, 5-1.
  }

  // Fix perimeter constraints
  for (let i = 0; i < sides; i++) {
    const idxA = i + 1;
    const idxB = ((i + 1) % sides) + 1;
    // Wait logic: i=0 -> 1, 2. i=4 -> 5, 1. Correct.
    pBody.addConstraint(idxA, idxB, 0.5);
  }

  world.addComponent(player, pBody);
  world.addComponent(player, new PlayerComponent());


  // Create Game Loop
  const gameLoop = new GameLoop(
    (dt: number) => {
      world.update(dt);
    },
    () => {
      renderSystem.update(0);
    }
  );

  // Native Bridge
  new NativeBridge(
    () => gameLoop.stop(),
    () => gameLoop.start()
  );

  // Security Check
  new NetworkMonitor((isOnline: boolean) => {
    if (isOnline) {
      gameLoop.start();
    } else {
      gameLoop.stop();
    }
  });

  gameLoop.start();
});
