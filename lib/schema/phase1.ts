export const PHASE1_APP_ROLES = [
  "founder_admin",
  "branch_admin",
  "doctor",
  "counselor",
  "staff",
  "patient",
  "family_member",
  "pending_clinician",
  "pending_staff",
] as const;

export type Phase1AppRole = (typeof PHASE1_APP_ROLES)[number];

export const PHASE1_MEMBERSHIP_STATUSES = [
  "pending",
  "active",
  "suspended",
] as const;

export type Phase1MembershipStatus = (typeof PHASE1_MEMBERSHIP_STATUSES)[number];

export const PHASE1_PROFILE_LANGUAGES = [
  "english",
  "urdu",
  "punjabi",
  "no_preference",
] as const;

export type Phase1ProfileLanguage = (typeof PHASE1_PROFILE_LANGUAGES)[number];
