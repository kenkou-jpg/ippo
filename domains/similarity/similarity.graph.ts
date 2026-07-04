import type { CaseID } from "../case/case.entity";
import type { SimilarityEdge } from "./similarity.entity";

/** Canonical edge key: always caseIdA < caseIdB */
export function edgeKey(a: CaseID, b: CaseID): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/** Return [caseIdA, caseIdB] in canonical order (A < B). */
export function canonicalPair(a: CaseID, b: CaseID): [CaseID, CaseID] {
  return a < b ? [a, b] : [b, a];
}

/**
 * In-memory undirected weighted graph over SimilarityEdge.
 * Used within a single batch run; persistence goes through SimilarityRepository.
 */
export class SimilarityGraph {
  private readonly edges = new Map<string, SimilarityEdge>();
  private readonly adjacency = new Map<CaseID, Set<CaseID>>();

  addEdge(edge: SimilarityEdge): void {
    const key = edgeKey(edge.caseIdA, edge.caseIdB);
    this.edges.set(key, edge);
    this.link(edge.caseIdA, edge.caseIdB);
    this.link(edge.caseIdB, edge.caseIdA);
  }

  hasEdge(a: CaseID, b: CaseID): boolean {
    return this.edges.has(edgeKey(a, b));
  }

  getEdge(a: CaseID, b: CaseID): SimilarityEdge | undefined {
    return this.edges.get(edgeKey(a, b));
  }

  neighbors(caseId: CaseID): CaseID[] {
    return Array.from(this.adjacency.get(caseId) ?? []);
  }

  allEdges(): SimilarityEdge[] {
    return Array.from(this.edges.values());
  }

  edgeCount(): number {
    return this.edges.size;
  }

  nodeCount(): number {
    return this.adjacency.size;
  }

  private link(from: CaseID, to: CaseID): void {
    if (!this.adjacency.has(from)) this.adjacency.set(from, new Set());
    this.adjacency.get(from)!.add(to);
  }
}
