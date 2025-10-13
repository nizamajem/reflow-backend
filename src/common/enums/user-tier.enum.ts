export const USER_TIER_VALUES = ["student", "public"] as const;

export type UserTier = (typeof USER_TIER_VALUES)[number];
