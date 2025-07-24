
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
 * Allows specifying a reference overtone set to sweep against.
 * @param {number[]} freq - Array of base frequencies (Hz) for the swept set.
 * @param {number[]} amp - Array of amplitudes for each frequency in the swept set.
 * @param {{alpha: number, dissonance: number}[]} coarseMinima - Array of coarse minima objects.
 * @param {number} searchWidth - Range to search around each coarse minimum.
 * @param {number} increment - Increment for alpha in the refined search.
 * @param {number[]} [refFreq] - Optional array of reference frequencies (Hz) to hold fixed.
 * @param {number[]} [refAmp] - Optional array of reference amplitudes for the reference frequencies.
 * @param {number} [offset=0] - Optional offset to apply to the search range.
 * @returns {{minimum: {alpha: number, dissonance: number}, curve: {alpha: number, dissonance: number}[]}[]} Array of objects containing refined minimum and its curve.
 */
function refineMinimaAndGetCurves(freq, amp, coarseMinima, searchWidth, increment, refFreq = null, refAmp = null, offset = 0) {
    const refinedResults = [];
    for (const coarseMin of coarseMinima) {
        const start = coarseMin.alpha - searchWidth + offset;
        const end = coarseMin.alpha + searchWidth + offset;
        const { alphas, dissonances } = generateDissonanceCurve(freq, amp, start, end, increment, refFreq, refAmp);
        
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
 * Find a scale of notes based on dissonance minima within specified constraints.
 * @param {number[]} freq - Array of base frequencies (Hz) for the swept set.
 * @param {number[]} amp - Array of amplitudes for each frequency in the swept set.
 * @param {number} minNotes - Minimum number of notes required in the scale.
 * @param {number} minRatio - Minimum ratio between successive frequencies.
 * @param {number} maxNotes - Maximum number of notes allowed in the scale.
 * @param {number[]} refFreq - Array of reference frequencies (Hz) to hold fixed.
 * @param {number[]} refAmp - Array of reference amplitudes for the reference frequencies.
 * @returns {{frequency: number, ratio: number, dissonance: number}[]} Array of scale notes sorted by frequency.
 */
function findScale(freq, amp, minNotes, minRatio, maxNotes, refFreq, refAmp) {
    // Search parameters - covering two octaves (1 octave above and below)
    const rangeStart = 0.5;  // One octave below
    const rangeEnd = 2.0;    // One octave above
    const coarseIncrement = 0.005;
    const fineSearchWidth = 0.01;
    const fineIncrement = 0.0005;
    
    // Generate coarse dissonance curve
    const { alphas, dissonances } = generateDissonanceCurve(freq, amp, rangeStart, rangeEnd, coarseIncrement, refFreq, refAmp);
    
    // Find local minima
    const coarseMinima = findLocalMinima(alphas, dissonances);
    
    // Refine minima
    const refinedResults = refineMinimaAndGetCurves(freq, amp, coarseMinima, fineSearchWidth, fineIncrement, refFreq, refAmp);
    const refinedMinima = refinedResults.map(r => r.minimum);
    
    // Sort minima by dissonance (lowest first)
    refinedMinima.sort((a, b) => a.dissonance - b.dissonance);
    
    // Convert to scale notes with frequencies
    const fundamental = refFreq[0]; // Assume first reference frequency is the fundamental
    const candidateNotes = refinedMinima.map(min => ({
        frequency: fundamental * min.alpha,
        ratio: min.alpha,
        dissonance: min.dissonance
    }));
    
    // Sort by frequency for ratio filtering
    candidateNotes.sort((a, b) => a.frequency - b.frequency);
    
    // Filter by minimum ratio constraint, but ensure minimum notes
    const selectedNotes = [];
    let lastFreq = 0;
    
    for (const note of candidateNotes) {
        const ratio = lastFreq > 0 ? note.frequency / lastFreq : Infinity;
        
        if (selectedNotes.length < minNotes || ratio >= minRatio) {
            selectedNotes.push(note);
            lastFreq = note.frequency;
            
            if (selectedNotes.length >= maxNotes) {
                break;
            }
        }
    }
    
    // If we don't have enough notes, add more from the best remaining candidates
    if (selectedNotes.length < minNotes) {
        const remaining = candidateNotes.filter(note => !selectedNotes.includes(note));
        remaining.sort((a, b) => a.dissonance - b.dissonance);
        
        while (selectedNotes.length < minNotes && remaining.length > 0) {
            selectedNotes.push(remaining.shift());
        }
        
        // Re-sort by frequency after adding notes
        selectedNotes.sort((a, b) => a.frequency - b.frequency);
    }
    
    return selectedNotes;
}

/**
 * Optimize scales by evaluating dissonance of each note against all other notes across all scales.
 * Selects the best notes for each overtone series based on combined dissonance scores.
 * @param {Array<Array<{frequency: number, ratio: number, dissonance: number}>>} scales - Array of scales, one for each overtone series.
 * @param {Array<{freq: number[], amp: number[]}>} overtoneSeries - Array of overtone series objects corresponding to the scales.
 * @param {number} targetNotes - Target number of notes to select for each scale.
 * @returns {Array<Array<{frequency: number, ratio: number, dissonance: number, combinedDissonance: number}>>} Optimized scales with combined dissonance scores.
 */
function optimizeScalesCombined(scales, overtoneSeries, targetNotes) {
    if (!Array.isArray(scales) || scales.length === 0) {
        throw new Error('scales must be a non-empty array');
    }
    
    if (!Array.isArray(overtoneSeries) || overtoneSeries.length !== scales.length) {
        throw new Error('overtoneSeries must be an array with the same length as scales');
    }
    
    // First, collect all notes from all scales with their source information
    const allNotes = [];
    scales.forEach((scale, scaleIndex) => {
        scale.forEach(note => {
            allNotes.push({
                ...note,
                scaleIndex: scaleIndex,
                sourceOvertones: overtoneSeries[scaleIndex]
            });
        });
    });
    
    console.log(`\nOptimizing ${scales.length} scales with ${allNotes.length} total candidate notes...`);
    
    // Calculate combined dissonance for each note against all other notes
    const notesWithCombinedScores = allNotes.map((note, noteIndex) => {
        let totalDissonance = 0;
        let comparisonCount = 0;
        
        // Compare this note against all other notes
        allNotes.forEach((otherNote, otherIndex) => {
            if (noteIndex === otherIndex) return; // Don't compare note to itself
            
            // Create frequency and amplitude arrays for dissonance calculation
            // Note's own overtone series + the other note treated as a fundamental
            const noteFreqs = note.sourceOvertones.freq;
            const noteAmps = note.sourceOvertones.amp;
            const otherFreqs = [otherNote.frequency];
            const otherAmps = [1.0]; // Treat other note as single fundamental with amplitude 1
            
            // Combine the two sets
            const combinedFreqs = [...noteFreqs, ...otherFreqs];
            const combinedAmps = [...noteAmps, ...otherAmps];
            
            // Calculate dissonance for this combination
            const pairDissonance = dissmeasure(combinedFreqs, combinedAmps);
            totalDissonance += pairDissonance;
            comparisonCount++;
        });
        
        const averageDissonance = comparisonCount > 0 ? totalDissonance / comparisonCount : note.dissonance;
        
        return {
            ...note,
            combinedDissonance: averageDissonance
        };
    });
    
    // Group notes back by their original scale
    const notesByScale = Array(scales.length).fill(null).map(() => []);
    notesWithCombinedScores.forEach(note => {
        notesByScale[note.scaleIndex].push(note);
    });
    
    // For each scale, select the best notes based on combined dissonance
    const optimizedScales = notesByScale.map((scaleNotes, scaleIndex) => {
        // Sort by combined dissonance (lowest first)
        scaleNotes.sort((a, b) => a.combinedDissonance - b.combinedDissonance);
        
        // Take the target number of notes (or all available if fewer)
        const selectedNotes = scaleNotes.slice(0, Math.min(targetNotes, scaleNotes.length));
        
        // Remove the temporary properties and sort by frequency
        const cleanedNotes = selectedNotes.map(({ scaleIndex, sourceOvertones, ...note }) => note);
        cleanedNotes.sort((a, b) => a.frequency - b.frequency);
        
        console.log(`  Scale ${scaleIndex + 1}: Selected ${cleanedNotes.length}/${scaleNotes.length} notes (target: ${targetNotes})`);
        
        return cleanedNotes;
    });
    
    return optimizedScales;
}

/**
 * Exported functions for dissonance analysis.
 */
module.exports = { 
    dissmeasure,
    generateDissonanceCurve,
    findLocalMinima,
    refineMinimaAndGetCurves,
    findScale,
    optimizeScalesCombined
};
