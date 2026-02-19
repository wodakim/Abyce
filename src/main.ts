import { GameLoop } from './core/GameLoop';
import { World } from './ecs/World';
import { RenderSystem } from './systems/RenderSystem';
import { InputSystem } from './systems/InputSystem';
import { NetworkMonitor } from './core/NetworkMonitor';
import { NativeBridge } from './bridge/NativeBridge';
import './ui/index'; // Initialize React UI

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  // Initialize Core Systems
  console.log('ABYCE Engine Initializing...');

  const world = new World();
  const renderSystem = new RenderSystem('game-canvas');
  const inputSystem = new InputSystem('game-canvas');

  // Input is a Logic System, runs in fixed update
  world.registerSystem(inputSystem);

  // Initialize Render Context
  renderSystem.init();

  // Create Game Loop
  const gameLoop = new GameLoop(
    (dt: number) => {
      // Logic Update (Fixed Step)
      world.update(dt);
    },
    () => {
      // Render Update (Variable Step, interpolated)
      renderSystem.update(0);
    }
  );

  // Native Bridge (Ads & Pausing)
  new NativeBridge(
    () => gameLoop.stop(), // On Pause (Ad Open)
    () => gameLoop.start() // On Resume (Ad Close)
  );

  // Security & Connectivity Check (Online Enforcement)
  new NetworkMonitor((isOnline: boolean) => {
    if (isOnline) {
      console.log("Online: Resuming GameLoop");
      gameLoop.start();
    } else {
      console.warn("Offline: Pausing GameLoop");
      gameLoop.stop();
    }
  });

  // Initial Start (optimistic)
  // Note: if offline, networkMonitor will trigger pause immediately after
  gameLoop.start();
});
