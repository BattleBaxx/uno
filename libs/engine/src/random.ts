// Mulberry32 seeded PRNG. Same rngState in → same value out, so games are reproducible.
// Returns a float in [0, 1) and the state to use for the next call.
export function nextRandom(rngState: number): {value: number; rngState: number} {
    const next = (rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(next ^ (next >>> 15), next | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return {value, rngState: next};
}