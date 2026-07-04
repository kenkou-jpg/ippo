// Bootstrap Config — environment reading, no side effects, no imports from app code
export function loadBootstrapConfig() {
  return Object.freeze({
    supabaseUrl: (typeof window !== 'undefined' ? window.SUPABASE_URL : undefined) ?? '',
    supabaseKey: (typeof window !== 'undefined' ? window.SUPABASE_KEY : undefined) ?? '',
    env:   import.meta.env?.MODE ?? 'production',
    debug: import.meta.env?.DEV  ?? false,
  });
}
