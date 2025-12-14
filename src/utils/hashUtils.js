/**
 * Hash Utilities for PrivacyGuard
 * Uses SHA-256 for secure cache key generation
 * 
 * SHA-256 provides 2^256 hash space (vs MD5's 2^128), offering:
 * - 2^128 resistance against birthday attacks
 * - 2^256 resistance against brute-force attacks
 * - No known practical collision attacks (NIST recommended)
 */

import crypto from 'crypto';

/**
 * Compute SHA-256 hash of input data
 * @param {string} data - Input string to hash
 * @returns {string} - 64-character hex string (256 bits)
 */
export function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute cache key from app and user privacy preferences
 * Uses double-hashing construction: SHA256(SHA256(app) + '-' + SHA256(preferences))
 * 
 * @param {Object} app - Application data object
 * @param {Object} userPreference - User privacy preference object
 * @returns {string} - 64-character hex cache key
 */
export function computeCacheKey(app, userPreference) {
    return sha256(
        sha256(JSON.stringify(app)) + '-' + sha256(JSON.stringify(userPreference))
    );
}

export default {
    sha256,
    computeCacheKey,
};
