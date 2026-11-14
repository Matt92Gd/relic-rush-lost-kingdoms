/**
 * PRNG deterministico basato su algoritmo Mulberry32 con hashing stringa FNV-1a.
 * Garantisce riproducibilità perfetta per seed condivisi e Daily Seed.
 */
export class SeededRandom {
  private state: number;
  public readonly seedString: string;

  constructor(seed: string | number = Date.now()) {
    this.seedString = String(seed);
    this.state = typeof seed === 'number' ? seed >>> 0 : SeededRandom.hashString(this.seedString);
    if (this.state === 0) {
      this.state = 0x9e3779b9;
    }
  }

  public static hashString(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  public static getDailySeed(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `DAILY-${year}-${month}-${day}`;
  }

  /** Restituisce un float in [0, 1) */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max) */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Intero in [min, max] inclusivo */
  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Probabilità booleana in [0, 1] */
  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Elemento casuale da array non vuoto */
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('SeededRandom.pick called on empty array');
    }
    return items[this.int(0, items.length - 1)];
  }
}
