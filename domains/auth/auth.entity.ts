import type { ID, Timestamp } from "../../shared/types/base";

export interface UserProfile {
  id: ID;
  userId: ID;
  displayName: string | null;
  locale: "ja" | "en";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
