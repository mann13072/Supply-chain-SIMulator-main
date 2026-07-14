/**
 * App-wide configuration flags.
 */

/**
 * Authentication toggle — the single switch for the login/landing flow.
 *
 *   true  → login is DISABLED. Visitors go straight into the app as a guest.
 *           The landing, login, and register pages are never shown.
 *
 *   false → login is REQUIRED. Visitors see the landing page first, then must
 *           sign in or create an account before reaching the app.
 *
 * Flip this one value to add or remove the login page whenever you need it.
 */
export const DISABLE_AUTH = true;
