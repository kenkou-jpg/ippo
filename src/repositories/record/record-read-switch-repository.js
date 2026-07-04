// RecordReadSwitchRepository — thin wrapper that redirects reads to V2 when switch is on.
// Writes always flow through DualWriteRecordRepository (dual write + diff audit maintained).
// PR-021: Record V2 Completion — Read Switch可能状態
import { IRecordRepository }          from '../../contracts/index.js';
import { assertImplementsContract }   from '../../application/architecture-guard.js';

export class RecordReadSwitchRepository extends IRecordRepository {
  /**
   * @param {import('../../contracts/IRecordRepository.js').IRecordRepository} dualWrite
   * @param {import('./record-v2-repository.js').RecordV2Repository}            v2Repo
   * @param {import('./record-read-switch.js').RecordReadSwitch}                readSwitch
   */
  constructor(dualWrite, v2Repo, readSwitch) {
    super();
    this._dual   = dualWrite;
    this._v2     = v2Repo;
    this._switch = readSwitch;
  }

  // ── Read path — delegates based on switch ───────────────────────────────────

  findById(id) {
    return this._switch.isV2Active()
      ? this._v2.findById(id)
      : this._dual.findById(id);
  }

  findByUserAndDate(userId, recordDate) {
    return this._switch.isV2Active()
      ? this._v2.findByUserAndDate(userId, recordDate)
      : this._dual.findByUserAndDate(userId, recordDate);
  }

  findAllByUser(userId) {
    return this._switch.isV2Active()
      ? this._v2.findAllByUser(userId)
      : this._dual.findAllByUser(userId);
  }

  // ── Write path — always dual-write ──────────────────────────────────────────

  save(record)        { return this._dual.save(record); }
  update(id, patch)   { return this._dual.update(id, patch); }
  delete(id)          { return this._dual.delete(id); }
}

assertImplementsContract(RecordReadSwitchRepository, IRecordRepository, 'RecordReadSwitchRepository');
