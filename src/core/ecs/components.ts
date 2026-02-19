export const Position = {
  name: 'position',
  stride: 2,
  type: Float32Array
};

export const PrevPosition = {
  name: 'prevPosition',
  stride: 2,
  type: Float32Array
};

export const Acceleration = {
  name: 'acceleration',
  stride: 2,
  type: Float32Array
};

export const VerletPoint = {
  name: 'verletPoint',
  stride: 3,
  type: Float32Array
};

export const Constraint = {
  name: 'constraint',
  stride: 4,
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

export const Color = {
  name: 'color',
  stride: 3,
  type: Float32Array
};

// New DNA Component
// [speed, perceptionRadius, r, g, b, density]
export const DNA = {
  name: 'dna',
  stride: 6,
  type: Float32Array
};
