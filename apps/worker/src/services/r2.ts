/**
 * R2 access rules for Nangua Gallery:
 *
 * - Gallery lists come from D1. R2.list() is only for sync / repair.
 * - put() is only used for brand-new UUID keys under uploads/YYYY/MM/
 *   (or a sanitized optional directory). Existing keys are never overwritten.
 * - delete() is only used for permanent delete of items already in Trash,
 *   and only when ENABLE_DELETE === "true".
 * - Compensate-delete is allowed only for a UUID key that was just uploaded
 *   in the same request, if D1 insert fails.
 * - Never rename, copy, migrate, or rewrite existing object keys.
 * - Existing public image URLs must keep working.
 */
export {}
