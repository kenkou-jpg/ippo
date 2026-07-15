# PR-EXP-RUNTIME-04: Experiment Lifecycle Gateway Integration

Founder Decisionを採用し実装。Prototype UIへの接続は行わない
（禁止事項どおり）。書込みCTA実装（PR-EXP-RUNTIME-05）は本PR完了後、
別途着手する。

## 実装した内容

### Decision 1 — State Machine Authority

- `ExperimentCommandService`から状態遷移ロジック（直接`status`書込み）を撤去。
  `start()`/`complete()`/`abandon()`は`ExperimentLifecycleService`（唯一の
  正、`ExperimentStateMachine`によるDRAFT→ACTIVE→COMPLETED/ABANDONED検証を
  内蔵）へ委譲する薄いラッパーへ整理
- 後方互換: コンストラクタは`(repository, lifecycleService = null)`。
  `lifecycleService`省略時も`create()`/`update()`/`delete()`（状態遷移を
  伴わない操作）は従来どおり動作する。`start()`/`complete()`/`abandon()`は
  未配線時に明示的なエラーを投げる（サイレントな旧挙動フォールバックはしない）
- `composition-root.js`: `ExperimentCommandService`のDIファクトリへ
  `ExperimentLifecycleService`を注入するよう変更

### Decision 2 — Status Vocabulary

- 正規4status（DRAFT/ACTIVE/COMPLETED/ABANDONED）はDomain内部
  （LifecycleService/CommandService/Repository）を通じて一貫して使用
- **新規発見**: legacy⇔domainのstatus変換は`ExperimentMapper`
  （`src/repositories/experiment/experiment-mapper.js`）に
  **既に実装済み**だった（`_toUpperStatus()`/`_toLowerStatus()`、
  legacy`'cancelled'`→domain`'ABANDONED'`変換含む）。新規Adapterの作成は
  不要と判断。`ExperimentRepositoryImpl`は実は legacy `state.experiments`
  （`ippo_state`キー、legacy `experiments.js`と同一ストレージ）を
  `ExperimentMapper`経由で読み書きしており、PR-EXP-RUNTIME-01時点の
  「完全に独立した2系統」という認識は不正確だった。正しくは
  「同一データを異なる抽象化層（legacy: 直接window.getState/setState、
  正: IStorageService+Mapper）から読み書きしている」が実態
- `ExperimentCommandService.create()`: 呼び出し元が`status`を渡しても
  無視し常にDRAFTで作成するよう修正（従来は`{status:'DRAFT', ...experiment}`
  というスプレッド順序の関係で呼び出し元の`status`が優先されてしまう
  バグがあった。正規4status以外の混入防止という意味でも、この修正は
  Decision 2の趣旨に合致する）
- `ExperimentCommandService.update()`: `status`フィールドを常に除去
  （状態遷移は`start`/`complete`/`abandon`経由のみに限定）

### Decision 3 — ApiGateway

- `ApiGateway`へ`startExperiment(id)`/`completeExperiment(id, actualEndDate)`/
  `abandonExperiment(id, reason, actualEndDate)`を追加。いずれも既存の
  `createExperiment()`と同じ`permissionService.require('experiment:write')`
  パターンを踏襲し、`ExperimentCommandService`へ委譲するのみ（status変更ロジックは
  一切持たない）
- 正規経路: `Prototype UI → ApiGateway → ExperimentCommandService →
  ExperimentLifecycleService → Repository` が確立された
  （UIはまだ未接続、経路のみ）

## 禁止事項の遵守確認

```
✓ Prototype CTA接続なし（experiment-next.htmlの「今日もOK」ボタンは
  引き続きdisabled、実装・配線を追加していない）
✓ Feature Flag既定ONへの変更なし
✓ Legacy experiments.js削除なし（無変更）
✓ Supabase Migrationなし
✓ 新しいstatus追加なし（既存4status以外は増やしていない）
✓ UI変更なし
✓ Home Experiment Card変更なし
✓ ExperimentNudgeService接続なし
✓ Case生成変更なし
```

## 完了条件チェック

```
✓ 状態遷移がLifecycleServiceへ一本化されている
  （CommandService.start/complete/abandonはLifecycleServiceへ委譲するのみ）
✓ UI・ApiGateway・CommandServiceからの直接status更新がない
  （ApiGatewayはCommandServiceへ委譲のみ。CommandService.create()は常にDRAFT
  固定、update()はstatusを除去。start/complete/abandonはLifecycleService
  呼び出しのみでstatusを直接書かない）
✓ 正規4status以外がDomain内部へ入らない
  （create()のDRAFT強制、ExperimentMapperの_toUpperStatus()フォールバック
  により防御）
✓ 既存テスト回帰なし
  （tests/bootstrap/pr015-experiment-layer.test.tsの3件が旧仕様
  ―create()が任意statusを許容・complete()がLifecycleService無しで動作―
  を前提にしていたため、Founder Decisionに合わせて新仕様のテストへ更新。
  これは意図的なDecisionの反映であり、意図しない回帰ではない）
✓ Build PASS
```

## テスト

新規:
- `tests/domains/experiment/experiment-lifecycle-service.test.js`（7件）:
  DRAFT→ACTIVE/ACTIVE→COMPLETED/ACTIVE→ABANDONEDの正常遷移、
  DRAFT→COMPLETED等の不正遷移がInvalidTransitionErrorを投げること、
  終端状態(COMPLETED/ABANDONED)からの遷移拒否、存在しないID
- `tests/application/experiment-command-service.test.js`（8件）:
  create()のDRAFT強制（明示的status指定を無視）、update()のstatus除去、
  start/complete/abandonのLifecycleServiceへの委譲、未配線時のエラー、
  create/update/deleteはlifecycleService無しでも動作すること
- `tests/application/api-gateway-experiment-lifecycle.test.js`（4件）:
  startExperiment/completeExperiment/abandonExperimentの委譲、
  experiment:write権限なしでの拒否

更新:
- `tests/bootstrap/pr015-experiment-layer.test.ts`: 旧仕様前提の3件を
  新仕様（Decision 1/2）に合わせて書き換え（上記参照）

Regression: tests/bootstrap・tests/arch・tests/domains/experiment・
tests/application・tests/modules/experiment-next・tests/modules/home-next
で計908件PASS。Build PASS（新規循環chunk警告なし）。

Browser Verification: 不要（UI変更なし、Prototype CTA未接続のためUI経由での
到達手段が存在しない）

## Next

PR-EXP-RUNTIME-05「Prototype CTA → ApiGateway接続」の設計確認へ進むが、
書込みCTAの実装前に一度停止する（Founder指示どおり）。
