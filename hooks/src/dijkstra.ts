// Graph structure:
/**
 * virtual START node
 * one layer per non-rest note, containing its candidates
 * virtual end node
 * edges connect every candidate in layer[i] to every candidate in layer[i+1]
 * filtered by hard constraints
 * weighted by transitionCost + positionCost
 */

import { edgeSatisfiesConstraints, getSlideShift } from "./constraintExtractor";
import { positionCost, transitionCost } from "./costFunctions";
import { Candidate, HardConstraint } from "@/types/fingeringTypes";
import { ParsedNote, ParsedPiece } from "@/types/parserTypes";

const START_NODE = -1;
const END_NODE = -2;
const MAX_CANDIDATES = 64;

function nodeId(layerIndex: number, candidateIndex: number): number {
  return layerIndex * MAX_CANDIDATES + candidateIndex;
}

// Dijsktra result
export interface DijsktraResult {
  // for each non-rest note (by original note id), the winning candidate
  assignments: Map<number, Candidate>;
  totalCost: number;
  // per note cost breakdown for debugging
  costBreakdown: Array<{
    noteId: number;
    positionCost: number;
    transitionCost: number;
  }>;
}

// Main function

export function dijkstra(
  piece: ParsedPiece,
  allCandidates: Map<number, Candidate[]>, // noteId -> candidates
  constraints: HardConstraint[],
): DijsktraResult {
  // Build the ordered list of active (non-rest) notes
  const activeNotes: ParsedNote[] = piece.notes.filter(
    (n) => !n.isRest && n.placements.length > 0,
  );

  if (activeNotes.length === 0) {
    return { assignments: new Map(), totalCost: 0, costBreakdown: [] };
  }

  // For each active note, get its candidate
  /**
   * if somehow a note has no candidates (that shouldn't happen)
   * we give it an empty layer
   */
  const layers: Array<{ note: ParsedNote; candidates: Candidate[] }> =
    activeNotes.map((note) => ({
      note,
      candidates: allCandidates.get(note.id) ?? [],
    }));

  // Priority queue: [cost, noteId]
  /**
   * using min-heap
   */

  const dist = new Map<number, number>();
  const prev = new Map<number, number>();
  const heap = new MinHeap<[number, number]>((a, b) => a[0] - b[0]);

  dist.set(START_NODE, 0);
  heap.push([0, START_NODE]);

  // DIJSKTRA MAIN LOOP

  while (!heap.isEmpty()) {
    const [currentCost, currentNode] = heap.pop()!;

    // skip if we found a better path already
    if (currentCost > (dist.get(currentNode) ?? Infinity)) continue;

    // reached end - done
    if (currentNode === END_NODE) break;

    // Expand from START to first layer
    if (currentNode === START_NODE) {
      if (layers.length === 0) {
        const newCost = 0;
        if (newCost < (dist.get(END_NODE) ?? Infinity)) {
          dist.set(END_NODE, newCost);
          prev.set(END_NODE, START_NODE);
          heap.push([newCost, END_NODE]);
        }
        continue;
      }

      const firstLayer = layers[0];
      for (let ci = 0; ci < firstLayer.candidates.length; ci++) {
        const candidate = firstLayer?.candidates[ci];
        const edgeCost = positionCost(candidate);
        const newCost = currentCost + edgeCost;
        const targetNode = nodeId(0, ci);

        if (newCost < (dist.get(targetNode) ?? Infinity)) {
          dist.set(targetNode, newCost);
          prev.set(targetNode, START_NODE);
          heap.push([newCost, targetNode]);
        }
      }
      continue;
    }

    // Decode current layer and candidate index
    const layerIndex = Math.floor(currentNode / MAX_CANDIDATES);
    const candidateIndex = currentNode % MAX_CANDIDATES;
    const currentLayer = layers[layerIndex];
    const currentCandidate = currentLayer.candidates[candidateIndex];

    // Last layer -> connect to END
    if (layerIndex === layers.length - 1) {
      const newCost = currentCost;
      if (newCost < (dist.get(END_NODE) ?? Infinity)) {
        dist.set(END_NODE, newCost);
        prev.set(END_NODE, currentNode);
        heap.push([newCost, END_NODE]);
      }
      continue;
    }

    // Expand to next layer
    const nextLayer = layers[layerIndex + 1];
    const currentNote = currentLayer?.note;
    const nextNote = nextLayer.note;

    // Time delta: gap between the two notes
    /**
     * use the end time of current note -> start time of next time
     * accounts for rests between them
     */
    const timeDelta =
      Math.max(
        nextNote.timeSeconds -
          (currentNote.timeSeconds + currentNote.durationSeconds),
        0.001, // floor to avoid division by zero
      ) + currentNote.durationSeconds;

    const availableTime = Math.max(currentNote?.durationSeconds, 0.001);

    const slideShift = getSlideShift(currentNote?.id, nextNote.id, constraints);

    for (let ni = 0; ni < nextLayer?.candidates.length; ni++) {
      const nextCandidate = nextLayer?.candidates[ni];

      // check for hahrd constraints
      const constraintSatisfied = edgeSatisfiesConstraints(
        currentNote?.id,
        nextNote.id,
        currentCandidate?.assignments,
        nextCandidate?.assignments,
        constraints,
      );
      if (!constraintSatisfied) continue;

      const tCost = transitionCost(
        currentCandidate,
        nextCandidate,
        availableTime,
        slideShift,
      );
      const pCost = positionCost(nextCandidate);
      const edgeCost = Math.max(0, tCost) + pCost;

      const targetNode = nodeId(layerIndex + 1, ni);
      const newCost = currentCost + edgeCost;

      if (newCost < (dist.get(targetNode) ?? Infinity)) {
        dist.set(targetNode, newCost);
        prev.set(targetNode, currentNode);
        heap.push([newCost, targetNode]);
      }
    }
  }

  // Reconstruct path
  const assignments = new Map<number, Candidate>();
  const costBreakdown: Array<{
    noteId: number;
    positionCost: number;
    transitionCost: number;
  }> = [];

  let node = END_NODE;
  const path: number[] = [];
  while (node !== START_NODE && node !== undefined) {
    path.unshift(node);
    node = prev.get(node);
  }

  const winningPath: number[] = [];
  let cur = END_NODE;
  while (prev.has(cur)) {
    winningPath.unshift(cur);
    cur = prev.get(cur);
  }

  for (const nodeInPath of winningPath) {
    if (nodeInPath === END_NODE || nodeInPath === START_NODE) continue;
    const li = Math.floor(nodeInPath / MAX_CANDIDATES);
    const ci = nodeInPath % MAX_CANDIDATES;
    const layer = layers[li];
    if (!layer) continue;
    const candidate = layer.candidates[ci];
    if (!candidate) continue;

    assignments.set(layer.note.id, candidate);

    const pc = positionCost(candidate);
    costBreakdown.push({
      noteId: layer.note.id,
      positionCost: pc,
      transitionCost: 0,
    });
  }

  const totalCost = dist.get(END_NODE) ?? Infinity;

  return { assignments, totalCost, costBreakdown };
}

class MinHeap<T> {
  private data: T[] = [];
  constructor(private compare: (a: T, b: T) => number) {}

  push(item: T): void {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.data.length === 0;
  }

  size(): number {
    return this.data.length;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);

      if (this.compare(this.data[i], this.data[parent]) < 0) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n && this.compare(this.data[left], this.data[smallest]) < 0)
        smallest = left;
      if (right < n && this.compare(this.data[right], this.data[smallest]) < 0)
        smallest = right;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [
          this.data[smallest],
          this.data[i],
        ];
        i = smallest;
      } else break;
    }
  }
}
