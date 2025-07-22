/**
 * Calculate roughness between two sine frequencies (0 to 1, human-perceived beating)
 * @param {number} f1 - Frequency 1 (Hz)
 * @param {number} f2 - Frequency 2 (Hz)
 * @returns {number} Roughness value in [0,1]
 */
function roughness(f1, f2) {
    const f_low = Math.min(f1, f2);
    const f_high = Math.max(f1, f2);
    const distance = f_high - f_low;

    // Estimate the critical bandwidth around the lower frequency
    const sharpness = 0.24 / (0.021 * f_low + 19);

    // Convert frequency distance to a normalized value
    const x = distance / sharpness;

    // Apply a smooth bell-shaped curve that peaks at the roughest distance
    const rough = Math.exp(-3.5 * x) * Math.pow(Math.sin(Math.PI * x), 2);

    // Clamp to [0,1] for safety
    return Math.max(0, Math.min(1, rough));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { roughness };
}
