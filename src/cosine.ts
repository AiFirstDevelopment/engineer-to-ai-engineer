// How alike two vectors point: 1 is the same direction, 0 is unrelated, -1 is opposite.
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let lengthA = 0;
  let lengthB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    lengthA += a[i] * a[i];
    lengthB += b[i] * b[i];
  }
  return dot / Math.sqrt(lengthA * lengthB);
}
