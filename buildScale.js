const { findScale, generateDissonanceCurve, findLocalMinima, refineMinimaAndGetCurves } = require('./dissonance.js');

/**
 * Build scales from multiple overtone series, each with its own search range.
 * @param {Array<{freq: number[], amp: number[]}>} overtoneSeries - Array of overtone series objects, each with freq and amp arrays. Must be ordered from lowest to highest fundamental.
 * @param {number} minNotes - Minimum number of notes required in each scale.
 * @param {number} minRatio - Minimum ratio between successive frequencies.
 * @param {number} [maxNotes=36] - Maximum number of notes allowed in each scale.
 * @returns {Array<Array<{frequency: number, ratio: number, dissonance: number}>>} Array of scales, one for each input overtone series.
 */
function buildScalesFromOvertones(overtoneSeries, minNotes, minRatio, maxNotes = 36) {
    if (!Array.isArray(overtoneSeries) || overtoneSeries.length === 0) {
        throw new Error('overtoneSeries must be a non-empty array');
    }
    
    // Validate that each overtone series has the required structure
    overtoneSeries.forEach((series, index) => {
        if (!series.freq || !Array.isArray(series.freq) || 
            !series.amp || !Array.isArray(series.amp) ||
            series.freq.length !== series.amp.length) {
            throw new Error(`Overtone series at index ${index} must have freq and amp arrays of equal length`);
        }
        if (series.freq.length === 0) {
            throw new Error(`Overtone series at index ${index} cannot be empty`);
        }
    });
    
    const scales = [];
    
    for (let i = 0; i < overtoneSeries.length; i++) {
        const currentSeries = overtoneSeries[i];
        const currentFundamental = currentSeries.freq[0]; // Lowest frequency is the fundamental
        
        // Fixed search range: from one octave below to two octaves above
        const rangeStart = currentFundamental * 0.5; // One octave below
        const rangeEnd = currentFundamental * 4.0;   // Two octaves above
        
        // Convert the range to ratios relative to the current fundamental
        const startRatio = rangeStart / currentFundamental;
        const endRatio = rangeEnd / currentFundamental;
        
        console.log(`Building scale ${i + 1}/${overtoneSeries.length}:`);
        console.log(`  Fundamental: ${currentFundamental.toFixed(2)} Hz`);
        console.log(`  Search range: ${rangeStart.toFixed(2)} - ${rangeEnd.toFixed(2)} Hz (ratios: ${startRatio.toFixed(3)} - ${endRatio.toFixed(3)})`);
        
        try {
            // Use a custom implementation based on findScale but with our specific range
            const scale = findScaleInRange(
                currentSeries.freq, 
                currentSeries.amp, 
                startRatio, 
                endRatio,
                minNotes, 
                minRatio, 
                maxNotes, 
                currentSeries.freq, 
                currentSeries.amp
            );
            
            scales.push(scale);
            console.log(`  Generated scale with ${scale.length} notes`);
            
        } catch (error) {
            console.error(`Error generating scale for series ${i + 1}: ${error.message}`);
            scales.push([]); // Push empty scale on error
        }
    }
    
    return scales;
}

/**
 * Find a scale within a specific range (modified version of findScale with custom range).
 * @param {number[]} freq - Array of base frequencies (Hz) for the swept set.
 * @param {number[]} amp - Array of amplitudes for each frequency in the swept set.
 * @param {number} rangeStart - Starting ratio for search.
 * @param {number} rangeEnd - Ending ratio for search.
 * @param {number} minNotes - Minimum number of notes required in the scale.
 * @param {number} minRatio - Minimum ratio between successive frequencies.
 * @param {number} maxNotes - Maximum number of notes allowed in the scale.
 * @param {number[]} refFreq - Array of reference frequencies (Hz) to hold fixed.
 * @param {number[]} refAmp - Array of reference amplitudes for the reference frequencies.
 * @returns {{frequency: number, ratio: number, dissonance: number}[]} Array of scale notes sorted by frequency.
 */
function findScaleInRange(freq, amp, rangeStart, rangeEnd, minNotes, minRatio, maxNotes, refFreq, refAmp) {
    // Search parameters
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

module.exports = {
    buildScalesFromOvertones,
    findScaleInRange
};
