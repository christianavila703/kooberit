export const USER_ROLES = {
  ADMIN: 'admin',
  CONTRACTOR: 'contractor',
  HOMEOWNER: 'homeowner',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_VALUES = Object.values(USER_ROLES) as UserRole[];

export const USER_ALLOW_STATUS = {
  ALLOW: 'allow',
  BLOCK: 'block',
} as const;

export type UserAllowStatus = (typeof USER_ALLOW_STATUS)[keyof typeof USER_ALLOW_STATUS];

export const USER_ALLOW_STATUS_VALUES = Object.values(USER_ALLOW_STATUS) as UserAllowStatus[];

export const DEFAULT_USER_ROLE = USER_ROLES.HOMEOWNER;
export const DEFAULT_USER_ALLOW_STATUS = USER_ALLOW_STATUS.ALLOW;

