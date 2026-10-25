export const USER_ROLES = ["author", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
