import type { CaseScoringProfile } from "./similarity.scorer";
import type { SimilarityRepository } from "./similarity.repository";
import type { SimilarityEventEmitter } from "./similarity.engine";
import { SimilarityEngine } from "./similarity.engine";
import { SimilarityGraph } from "./similarity.graph";

export interface BatchResult {
  processed: number;
  edgesCreated: number;
  edgesUpdated: number;
  durationMs: number;
}

export interface BatchLogger {
  info(msg: string): void;
  warn(msg: string): void;
}

const noopLogger: BatchLogger = { info: () => {}, warn: () => {} };

/**
 * Nightly batch job — processes only cases not yet in the similarity graph
 * (new-case diff processing). Runs O(n * k) where k = existing nodes,
 * not O(n²), by processing each new case against a fixed snapshot of
 * existing profiles (approximation allowed per spec).
 */
export class SimilarityBatchJob {
  private readonly engine: SimilarityEngine;

  constructor(
    private readonly repo: SimilarityRepository,
    emit: SimilarityEventEmitter,
    private readonly logger: BatchLogger = noopLogger,
  ) {
    this.engine = new SimilarityEngine(repo, emit);
  }

  /**
   * @param allProfiles - all current case profiles (caller fetches from Case domain)
   */
  async run(allProfiles: CaseScoringProfile[]): Promise<BatchResult> {
    const start = Date.now();
    const graph = new SimilarityGraph();

    // Load existing edges into in-memory graph for duplicate detection
    const existingCaseIds = await this.repo.findAllCaseIdsWithEdges();

    // Diff: new cases are those with no existing edges yet
    const newProfiles = allProfiles.filter((p) => !existingCaseIds.has(p.caseId));
    const existingProfiles = allProfiles.filter((p) => existingCaseIds.has(p.caseId));

    this.logger.info(
      `Batch: ${allProfiles.length} total, ${newProfiles.length} new, ${existingProfiles.length} existing`,
    );

    let edgesCreated = 0;
    let edgesUpdated = 0;

    for (const newProfile of newProfiles) {
      const edges = await this.engine.computeIncremental(newProfile, [
        ...existingProfiles,
        // also compare new profiles processed so far (added to graph)
        ...graph.allEdges().flatMap(() => [] as CaseScoringProfile[]),
      ]);

      // Also compare new cases against each other (within the new batch)
      for (const otherNew of newProfiles) {
        if (otherNew.caseId >= newProfile.caseId) continue; // avoid double-processing
        if (graph.hasEdge(newProfile.caseId, otherNew.caseId)) continue;
        const edge = await this.engine.computePair(newProfile, otherNew);
        if (edge) {
          graph.addEdge(edge);
          edgesCreated++;
        }
      }

      for (const edge of edges) {
        if (!graph.hasEdge(edge.caseIdA, edge.caseIdB)) {
          graph.addEdge(edge);
          edgesCreated++;
        } else {
          edgesUpdated++;
        }
      }
    }

    const durationMs = Date.now() - start;
    this.logger.info(
      `Batch complete: ${edgesCreated} created, ${edgesUpdated} updated in ${durationMs}ms`,
    );

    return {
      processed: newProfiles.length,
      edgesCreated,
      edgesUpdated,
      durationMs,
    };
  }
}
