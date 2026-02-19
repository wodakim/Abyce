import { World } from '../ecs/World';
import { ComponentManager } from '../ecs/ComponentManager';

export class CameraSystem {
  private cameraManager: ComponentManager<Float32Array>;
  private positionManager: ComponentManager<Float32Array>;
  private playerTagManager: ComponentManager<Uint8Array>;
  private verletPointManager: ComponentManager<Float32Array>;

  private readonly LERP_FACTOR = 0.1;
  private readonly ZOOM_LERP_FACTOR = 0.05;
  private readonly BASE_SCALE = 150.0;

  constructor(world: World) {
    this.cameraManager = world.getComponent('cameraData');
    this.positionManager = world.getComponent('position');
    this.playerTagManager = world.getComponent('playerTag');
    this.verletPointManager = world.getComponent('verletPoint');
  }

  update(_dt: number) {
    // 1. Find Player
    const players = this.playerTagManager.getDenseEntities();
    if (players.length === 0) return;
    const playerId = players[0]; // Assume single player for now

    if (!this.positionManager.has(playerId) || !this.verletPointManager.has(playerId)) return;

    const playerPosIdx = this.positionManager.getIndex(playerId) * 2;
    const playerPosData = this.positionManager.getRawData();
    const targetX = playerPosData[playerPosIdx];
    const targetY = playerPosData[playerPosIdx + 1];

    const playerVerletIdx = this.verletPointManager.getIndex(playerId) * 3;
    const playerVerletData = this.verletPointManager.getRawData();
    const playerRadius = playerVerletData[playerVerletIdx];

    // 2. Find Camera
    const cameras = this.cameraManager.getDenseEntities();
    if (cameras.length === 0) return;
    const camId = cameras[0];

    const camIdx = this.cameraManager.getIndex(camId) * 4;
    const camData = this.cameraManager.getRawData();

    // camData structure: [x, y, currentZoom, targetZoom]
    let camX = camData[camIdx];
    let camY = camData[camIdx + 1];
    let currentZoom = camData[camIdx + 2];

    // Lerp Position
    camX += (targetX - camX) * this.LERP_FACTOR;
    camY += (targetY - camY) * this.LERP_FACTOR;

    // Calculate Target Zoom
    // Avoid division by zero
    const r = Math.max(playerRadius, 1.0);
    const targetZoom = this.BASE_SCALE / (r * 2.0);

    // Lerp Zoom
    currentZoom += (targetZoom - currentZoom) * this.ZOOM_LERP_FACTOR;

    // Write back
    camData[camIdx] = camX;
    camData[camIdx + 1] = camY;
    camData[camIdx + 2] = currentZoom;
    camData[camIdx + 3] = targetZoom;
  }
}
