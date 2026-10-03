/**
 * App-wide configuration flags.
 */

/**
 * Authentication toggle — the single switch for the login/landing flow.
 *
 *   true  → login is DISABLED. Visitors go straight into the app as a guest.
 *           The landing, login, and register pages are never shown.
 *
 *   false → login is OPTIONAL. Visitors see the landing page first, then
 *           choose: sign in / create an account (work is saved to the cloud),
 *           or continue as a guest (nothing is saved).
 *
 * Flip this one value to add or remove the login page whenever you need it.
 */
export const DISABLE_AUTH = true;
