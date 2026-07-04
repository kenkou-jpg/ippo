// AuthContext — immutable snapshot of the current user's authentication state.
// PR-020: Auth Domain Migration

export class UserSession {
  constructor({ id, email = null, role = 'user', isAdmin = false, isPremium = false }) {
    this.id        = id;
    this.email     = email;
    this.role      = role;
    this.isAdmin   = isAdmin;
    this.isPremium = isPremium;
    Object.freeze(this);
  }

  get isAuthenticated() { return !!this.id; }
}

export class AuthContext {
  #session;

  constructor(session) {
    this.#session = session ?? null;
  }

  get session()         { return this.#session; }
  get isAuthenticated() { return !!this.#session; }
  get userId()          { return this.#session?.id ?? null; }
  get role()            { return this.#session?.role ?? 'guest'; }
  get isAdmin()         { return this.#session?.isAdmin ?? false; }
  get isPremium()       { return this.#session?.isPremium ?? false; }

  static guest() { return new AuthContext(null); }
}
