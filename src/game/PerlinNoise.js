/**
 * PerlinNoise.js — lightweight seeded 2D Perlin noise.
 *
 * Adapted from the classic reference implementation.
 * Seeded so each game session generates a unique world,
 * but the same seed always produces the same terrain.
 *
 * Usage:
 *   const noise = new PerlinNoise(seed)
 *   const v = noise.get(x, y)  // returns -1..1
 */

export default class PerlinNoise {
  constructor(seed = Math.random()) {
    this._perm = this._buildPermutation(seed)
  }

  _buildPermutation(seed) {
    // Simple seeded PRNG (mulberry32)
    let s = Math.floor(seed * 0xffffffff) >>> 0
    const rand = () => {
      s += 0x6d2b79f5
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff
    }

    // Build shuffled permutation table
    const p = Array.from({ length: 256 }, (_, i) => i)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]]
    }
    // Double it to avoid wrapping
    return [...p, ...p]
  }

  _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
  _lerp(a, b, t) { return a + t * (b - a) }

  _grad(hash, x, y) {
    const h = hash & 7
    const u = h < 4 ? x : y
    const v = h < 4 ? y : x
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
  }

  // Returns value in range -1..1
  get(x, y) {
    const p    = this._perm
    const X    = Math.floor(x) & 255
    const Y    = Math.floor(y) & 255
    const xf   = x - Math.floor(x)
    const yf   = y - Math.floor(y)
    const u    = this._fade(xf)
    const v    = this._fade(yf)

    const aa   = p[p[X]     + Y]
    const ab   = p[p[X]     + Y + 1]
    const ba   = p[p[X + 1] + Y]
    const bb   = p[p[X + 1] + Y + 1]

    return this._lerp(
      this._lerp(this._grad(aa, xf,     yf),     this._grad(ba, xf - 1, yf),     u),
      this._lerp(this._grad(ab, xf,     yf - 1), this._grad(bb, xf - 1, yf - 1), u),
      v
    )
  }

  // Fractal Brownian Motion — layered octaves for richer terrain
  // Returns 0..1
  fbm(x, y, octaves = 3) {
    let val = 0, amp = 0.5, freq = 1, max = 0
    for (let i = 0; i < octaves; i++) {
      val += this.get(x * freq, y * freq) * amp
      max  += amp
      amp  *= 0.5
      freq *= 2
    }
    return (val / max + 1) / 2   // normalise to 0..1
  }
}
