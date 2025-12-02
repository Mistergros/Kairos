export interface EmbeddedDocument {
  id: string;
  text: string;
  vector: number[];
  metadata?: Record<string, string>;
}

export function embed(text: string): number[] {
  // Simple deterministic hash-based embedding to avoid external dependencies
  const vector = new Array(8).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const slot = i % vector.length;
    vector[slot] += text.charCodeAt(i) % 17;
  }
  return vector;
}

export function similarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function search(query: string, corpus: EmbeddedDocument[], limit = 5): EmbeddedDocument[] {
  const queryVector = embed(query);
  return [...corpus]
    .map((doc) => ({ doc, score: similarity(queryVector, doc.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.doc);
}
