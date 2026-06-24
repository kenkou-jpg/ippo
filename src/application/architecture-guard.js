// Architecture Guard — runtime safety net for forbidden dependency patterns.
// Primary enforcement is static (import graph analysis); this catches dynamic violations.
//
// PR-011:   feature→feature, repository→ui, domain→ui
// PR-011.5: contract must be a leaf node (no domain/repo/ui imports)
// PR-012:   feature must not reach localStorage/Supabase/legacy directly
// PR-013:   UI/screens must not import repositories directly; Repository → StorageService only
const FORBIDDEN = [
  // PR-011
  { from: /\/features\/[^/]+\//, to: /\/features\/[^/]+\//, label: 'feature→feature'      },
  { from: /\/repositories\//,    to: /\/(screens|ui)\//,    label: 'repository→ui'        },
  { from: /\/domains\//,         to: /\/(screens|ui)\//,    label: 'domain→ui'            },
  // PR-011.5 — contracts are leaf nodes
  { from: /\/contracts\//,       to: /\/domains\//,         label: 'contract→domain'      },
  { from: /\/contracts\//,       to: /\/repositories\//,    label: 'contract→repository'  },
  { from: /\/contracts\//,       to: /\/(screens|ui)\//,    label: 'contract→ui'          },
  // PR-012 — features/screens bypass adapter layer
  { from: /\/features\//,        to: /\/services\/supabase/, label: 'feature→supabase'    },
  { from: /\/features\//,        to: /\/legacy\//,           label: 'feature→legacy'      },
  { from: /\/screens\//,         to: /\/services\/supabase/, label: 'screen→supabase'     },
  // PR-013 — UI must not reach repositories directly
  { from: /\/screens\//,         to: /\/repositories\//,    label: 'screen→repository'    },
  { from: /\/features\//,        to: /\/repositories\//,    label: 'feature→repository'   },
  // PR-013 — repositories must only depend on StorageService (not UI, not other repos)
  { from: /\/repositories\//,    to: /\/repositories\//,    label: 'repository→repository'},
];

export function runArchitectureGuard() {
  if (typeof window === 'undefined') return;

  window.__ippoArchGuard = {
    violations: [],
    check(from, to) {
      for (const { from: fRe, to: tRe, label } of FORBIDDEN) {
        if (fRe.test(from) && tRe.test(to)) {
          const msg = `[ArchGuard] Forbidden dependency: ${label} — "${from}" → "${to}"`;
          console.error(msg);
          this.violations.push({ from, to, label, ts: Date.now() });
        }
      }
    },
  };
}

/**
 * Verify that a class extends the expected contract base.
 * Called at adapter/repository module load time.
 */
export function assertImplementsContract(impl, contract, token) {
  if (!(impl.prototype instanceof contract)) {
    const msg = `[ArchGuard] "${token}" does not extend ${contract.name}. ` +
                `All Repository and Adapter classes must extend their contract.`;
    console.error(msg);
    if (typeof window !== 'undefined' && window.__ippoArchGuard) {
      window.__ippoArchGuard.violations.push({
        from: impl.name ?? 'unknown',
        to:   contract.name,
        label: 'missing-contract',
        ts: Date.now(),
      });
    }
  }
}
