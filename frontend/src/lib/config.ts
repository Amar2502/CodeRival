/**
 * Application environment configuration & Anti-Cheat toggle.
 *
 * Controlled via environment variable NEXT_PUBLIC_APP_ENV:
 * - DEVELOPMENT: Anti-cheat system is completely disabled (no event listeners, no paste blocking, no warning triggers).
 * - PRODUCTION: Anti-cheat system is fully enabled.
 */

export const APP_ENV = (process.env.NEXT_PUBLIC_APP_ENV || 'PRODUCTION').toUpperCase()

export const isDevelopment = APP_ENV === 'DEVELOPMENT'
export const isAntiCheatEnabled = !isDevelopment
