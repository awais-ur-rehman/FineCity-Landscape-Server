/** @enum {string} User roles */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
};

/** @enum {string} All valid roles */
export const ALL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE];

/** OTP configuration */
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 3;

/** JWT configuration */
export const JWT_ACCESS_EXPIRES_IN = '15m';
export const JWT_REFRESH_EXPIRES_IN = '30d';

/** Rate limiting */
export const RATE_LIMIT_GENERAL = { windowMs: 15 * 60 * 1000, max: 100 };
export const RATE_LIMIT_OTP = { windowMs: 15 * 60 * 1000, max: 3 };

/** Care types */
export const CARE_TYPES = ['watering', 'fertilizing', 'pruning', 'pest_control', 'repotting'];

/** Task statuses */
export const TASK_STATUSES = ['pending', 'completed', 'missed', 'skipped'];

/** Plant batch categories */
export const PLANT_CATEGORIES = ['indoor', 'outdoor', 'cactus', 'succulent', 'palm', 'herb'];
