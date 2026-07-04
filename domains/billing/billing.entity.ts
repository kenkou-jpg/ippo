import type { ID, Timestamp } from "../../shared/types/base";

export type PlanType = "FREE" | "PRO" | "CLINIC";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export interface Subscription {
  id: ID;
  userId: ID;
  plan: PlanType;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
