// Placeholder DB client — replaced by real implementation in PR-007
export const db = {
  query: async (_sql: string, _params?: unknown[]) => {
    throw new Error("DB not implemented yet");
  },
};
