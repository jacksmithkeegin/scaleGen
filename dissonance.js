
/**
 * Calculate the sensory dissonance of a set of partials using the Sethares model.
 * @param {number[]} fvec - Array of frequencies (Hz) for each partial.
 * @param {number[]} amp - Array of amplitudes for each partial (same length as fvec).
 * @returns {number} Dissonance value (lower = more consonant).
 */
function dissmeasure(fvec, amp) {
    const Dstar = 0.24;
    const S1 = 0.0207;
    const S2 = 18.96;
    const C1 = 5;
    const C2 = -5;
    const A1 = -3.51;
    const A2 = -5.75;

    const partials = fvec.map((f, i) => ({ f, a: amp[i] }))
                         .sort((p1, p2) => p1.f - p2.f);

    const N = partials.length;
    let D = 0;

    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const f1 = partials[i].f;
            const amp1 = partials[i].a;
            const f2 = partials[j].f;
            const amp2 = partials[j].a;

            const Fmin = f1;
            const Fdif = f2 - f1;
            const a = Math.min(amp1, amp2);

            const S = Dstar / (S1 * Fmin + S2);
            const Dnew = a * (C1 * Math.exp(A1 * S * Fdif) + C2 * Math.exp(A2 * S * Fdif));
            D += Dnew;
        }
    }
    return D;
}

/**
 * Generate a dissonance curve by varying the frequency ratio (alpha) and measuring dissonance.
 * Allows specifying a reference overtone set to sweep against.
 * @param {number[]} freq - Array of base frequencies (Hz) for the swept set.
 * @param {number[]} amp - Array of amplitudes for each frequency in the swept set.
 * @param {number} start - Starting alpha value (ratio).
 * @param {number} end - Ending alpha value (ratio).
 * @param {number} inc - Increment for alpha.
 * @param {number[]} [refFreq] - Optional array of reference frequencies (Hz) to hold fixed.
 * @param {number[]} [refAmp] - Optional array of reference amplitudes for the reference frequencies.
 * @returns {{alphas: number[], dissonances: number[]}} Object containing arrays of alpha values and corresponding dissonance values.
 */
function generateDissonanceCurve(freq, amp, start, end, inc, refFreq = null, refAmp = null) {
    const dissonances = [];
    const alphas = [];
    for (let alpha = start; alpha <= end; alpha += inc) {
        // If reference overtone set is provided, use it; otherwise, use freq/amp as reference
        const sweepFreq = freq.map(val => val * alpha);
        const sweepAmp = [...amp];
        const baseFreq = refFreq ? refFreq : freq;
        const baseAmp = refAmp ? refAmp : amp;
        const f = [...baseFreq, ...sweepFreq];
        const a = [...baseAmp, ...sweepAmp];
        const d = dissmeasure(f, a);
        dissonances.push(d);
        alphas.push(alpha);
    }
    return { alphas, dissonances };
}

/**
 * Find local minima in a dissonance curve.
 * @param {number[]} alphas - Array of alpha values (ratios).
 * @param {number[]} dissonances - Array of dissonance values corresponding to alphas.
 * @returns {{alpha: number, dissonance: number}[]} Array of objects for each local minimum found.
 */
function findLocalMinima(alphas, dissonances) {
    const minima = [];
    // Check start
    if (dissonances[0] < dissonances[1]) {
        minima.push({ alpha: alphas[0], dissonance: dissonances[0] });
    }
    // Check interior
    for (let i = 1; i < dissonances.length - 1; i++) {
        if (dissonances[i] < dissonances[i - 1] && dissonances[i] < dissonances[i + 1]) {
            minima.push({ alpha: alphas[i], dissonance: dissonances[i] });
        }
    }
    // Check end
    if (dissonances[dissonances.length - 1] < dissonances[dissonances.length - 2]) {
        minima.push({ alpha: alphas[alphas.length - 1], dissonance: dissonances[dissonances.length - 1] });
    }
    return minima;
}

/**
 * Refine the location of coarse minima by searching in a narrower range and return refined minima and their curves.
 * @param {number[]} freq - Array of base frequencies (Hz).
 * @param {number[]} amp - Array of amplitudes for each frequency.
 * @param {{alpha: number, dissonance: number}[]} coarseMinima - Array of coarse minima objects.
 * @param {number} searchWidth - Range to search around each coarse minimum.
 * @param {number} increment - Increment for alpha in the refined search.
 * @returns {{minimum: {alpha: number, dissonance: number}, curve: {alpha: number, dissonance: number}[]}[]} Array of objects containing refined minimum and its curve.
 */
function refineMinimaAndGetCurves(freq, amp, coarseMinima, searchWidth, increment) {
    const refinedResults = [];
    for (const coarseMin of coarseMinima) {
        const start = coarseMin.alpha - searchWidth;
        const end = coarseMin.alpha + searchWidth;
        const { alphas, dissonances } = generateDissonanceCurve(freq, amp, start, end, increment);
        
        let minDissonance = Infinity;
        let minAlpha = -1;
        const curve = [];

        for (let i = 0; i < dissonances.length; i++) {
            const currentAlpha = alphas[i];
            const currentDissonance = dissonances[i];
            curve.push({ alpha: currentAlpha, dissonance: currentDissonance });
            if (currentDissonance < minDissonance) {
                minDissonance = currentDissonance;
                minAlpha = currentAlpha;
            }
        }
        
        if (minAlpha !== -1) {
            refinedResults.push({ 
                minimum: { alpha: minAlpha, dissonance: minDissonance },
                curve: curve 
            });
        }
    }
    return refinedResults;
}

/**
 * Exported functions for dissonance analysis.
 */
module.exports = { 
    dissmeasure,
    generateDissonanceCurve,
    findLocalMinima,
    refineMinimaAndGetCurves
};
