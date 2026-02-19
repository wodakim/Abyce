export const Position = {
  name: 'position',
  stride: 2, // [x, y]
  type: Float32Array
};

export const PrevPosition = {
  name: 'prevPosition',
  stride: 2, // [x, y]
  type: Float32Array
};

export const Acceleration = {
  name: 'acceleration',
  stride: 2, // [x, y]
  type: Float32Array
};

export const VerletPoint = {
  name: 'verletPoint',
  stride: 3, // [radius, friction, isPinned]
  type: Float32Array
};

export const Constraint = {
  name: 'constraint',
  stride: 4, // [entityA, entityB, distance, stiffness]
  type: Float32Array
};

export const PlayerTag = {
  name: 'playerTag',
  stride: 1,
  type: Uint8Array
};

export const FoodTag = {
  name: 'foodTag',
  stride: 1,
  type: Uint8Array
};

// New Color Component
export const Color = {
  name: 'color',
  stride: 3, // [r, g, b]
  type: Float32Array
};
