// RecordReadSwitch — runtime flag controlling which repository serves reads.
// Default: V2 inactive (legacy is source of truth).
// Activated by RecordMigrationService when matchRate >= 99.9% AND criticalDiffCount == 0.
// PR-021: Record V2 Completion
export class RecordReadSwitch {
  #v2Active = false;

  enableV2()    { this.#v2Active = true; }
  disableV2()   { this.#v2Active = false; }
  isV2Active()  { return this.#v2Active; }

  /** @returns {'LEGACY'|'V2'} */
  get activeSource() { return this.#v2Active ? 'V2' : 'LEGACY'; }
}
