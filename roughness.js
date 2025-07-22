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


/**
 * Scan a range of fundamentals and compute total roughness for each, given overtone series
 * @param {Array} primarySeries - Array of {frequency, amplitude} for primary instrument
 * @param {Array[]} secondarySeriesArr - Array of arrays of {frequency, amplitude} for secondary instruments
 * @param {Object} options - { rangeOctaves, granularityCents }
 * @returns {Array} Array of {fundamental, totalRoughness}
 */
function scanRoughness(primarySeries, secondarySeriesArr, options = {}) {
    // Defaults
    const rangeOctaves = options.rangeOctaves || 2;
    const granularityCents = options.granularityCents || 5;

    // Get current fundamental from primary series (lowest frequency) or use override
    const fundamental = options.centerFundamental || Math.min(...primarySeries.map(ot => ot.frequency));

    // Range: center on fundamental, ±rangeOctaves/2
    const minFund = fundamental / Math.pow(2, rangeOctaves/2);
    const maxFund = fundamental * Math.pow(2, rangeOctaves/2);

    // Step size in Hz for granularity
    const stepRatio = Math.pow(2, granularityCents/1200); // 1200 cents = 1 octave
    let fund = minFund;
    const results = [];

    // Threshold for roughness calculation: pairs closer than this in Hz
    // We'll set threshold so roughness(f1, f2) < 0.05 for typical values
    function getThreshold(f) {
        // Critical bandwidth at f, times a factor (e.g., 0.5)
        const sharpness = 0.24 / (0.021 * f + 19);
        return sharpness * 0.5; // adjustable factor
    }

    while (fund <= maxFund) {
        // Shift all overtone series to this fundamental
        const shiftedPrimary = primarySeries.map(ot => ({
            frequency: ot.frequency * (fund / fundamental),
            amplitude: ot.amplitude
        }));
        const shiftedSecondaries = secondarySeriesArr.map(series =>
            series.map(ot => ({
                frequency: ot.frequency * (fund / fundamental),
                amplitude: ot.amplitude
            }))
        );

        // Collect all overtones
        const allSeries = [shiftedPrimary, ...shiftedSecondaries];
        const allOvertones = allSeries.flat();

        // Compute roughness for all pairs within threshold
        let totalRoughness = 0;
        for (let i = 0; i < allOvertones.length; i++) {
            const ot1 = allOvertones[i];
            for (let j = i + 1; j < allOvertones.length; j++) {
                const ot2 = allOvertones[j];
                const dist = Math.abs(ot1.frequency - ot2.frequency);
                const threshold = getThreshold(Math.min(ot1.frequency, ot2.frequency));
                if (dist <= threshold) {
                    const r = roughness(ot1.frequency, ot2.frequency);
                    totalRoughness += r * ot1.amplitude * ot2.amplitude;
                }
            }
        }
        results.push({ fundamental: fund, totalRoughness });
        fund *= stepRatio;
    }
    return results;
}


/**
 * Wrapper: Find fundamental with minimum weighted roughness in scan
 * @param {Array} primarySeries - Array of {frequency, amplitude} for primary instrument
 * @param {Array[]} secondarySeriesArr - Array of arrays of {frequency, amplitude} for secondary instruments
 * @param {Object} options - { rangeOctaves, granularityCents }
 * @returns {Object} { fundamental, totalRoughness }
 */

function findMinRoughnessFundamental(primarySeries, secondarySeriesArr, options = {}) {
    // First scan: coarse
    const curve = scanRoughness(primarySeries, secondarySeriesArr, options);
    if (!curve.length) return null;

    // Get current fundamental
    const fundamental = Math.min(...primarySeries.map(ot => ot.frequency));
    // Range for triangle weight
    const minFund = curve[0].fundamental;
    const maxFund = curve[curve.length - 1].fundamental;
    const range = maxFund - minFund;

    // Triangle weight: peak at current fundamental, zero at edges
    function triangleWeight(f) {
        const dist = Math.abs(f - fundamental);
        return Math.max(0, 1 - dist / (range / 2));
    }

    let minVal = null;
    let minRough = Infinity;
    for (const pt of curve) {
        const weight = triangleWeight(pt.fundamental);
        const weightedRough = pt.totalRoughness / (weight + 1e-6); // avoid div by zero
        if (weightedRough < minRough) {
            minRough = weightedRough;
            minVal = pt;
        }
    }

    // Refined scan: narrow region around minVal.fundamental, finer granularity
    const refineRangeCents = options.refineRangeCents || 20; // ±10 cents
    const refineGranularityCents = options.refineGranularityCents || 0.5; // 0.5 cent steps
    const centerFund = minVal.fundamental;
    const minRefineFund = centerFund * Math.pow(2, -refineRangeCents/2400);
    const maxRefineFund = centerFund * Math.pow(2, refineRangeCents/2400);
    const refineOptions = {
        rangeOctaves: Math.log2(maxRefineFund/minRefineFund),
        granularityCents: refineGranularityCents
    };

    // Override scan range to be centered on centerFund
    const refinedCurve = scanRoughness(
        primarySeries,
        secondarySeriesArr,
        Object.assign({}, refineOptions, {
            // Center the scan on centerFund
            centerFundamental: centerFund
        })
    );

    // Find refined minimum
    let refinedMinVal = null;
    let refinedMinRough = Infinity;
    for (const pt of refinedCurve) {
        const weight = triangleWeight(pt.fundamental);
        const weightedRough = pt.totalRoughness / (weight + 1e-6);
        if (weightedRough < refinedMinRough) {
            refinedMinRough = weightedRough;
            refinedMinVal = pt;
        }
    }
    return refinedMinVal;
}


/**
 * Find multiple local minima of roughness curve, with constraints
 * @param {Array} primarySeries - Array of {frequency, amplitude} for primary instrument
 * @param {Array[]} secondarySeriesArr - Array of arrays of {frequency, amplitude} for secondary instruments
 * @param {Object} options - { rangeOctaves, granularityCents, minRatio, targetCount, refineRangeCents, refineGranularityCents }
 * @returns {Array} Array of selected note frequencies (local minima)
 */
function findScale(primarySeries, secondarySeriesArr, options = {}) {
    const rangeOctaves = options.rangeOctaves || 2;
    const granularityCents = options.granularityCents || 5;
    const minRatio = options.minRatio || Math.pow(2, 100/1200); // ~100 cents
    const targetCount = options.targetCount || 7;
    const refineRangeCents = options.refineRangeCents || 20;
    const refineGranularityCents = options.refineGranularityCents || 0.5;

    // Special case: if no secondary instruments, use overtone frequencies as scale
    if (!secondarySeriesArr || secondarySeriesArr.length === 0) {
        const fundamental = Math.min(...primarySeries.map(ot => ot.frequency));
        const rangeMin = fundamental / Math.pow(2, rangeOctaves/2);
        const rangeMax = fundamental * Math.pow(2, rangeOctaves/2);
        
        // Select overtones within the range, sorted by amplitude
        let candidates = primarySeries
            .filter(ot => ot.frequency >= rangeMin && ot.frequency <= rangeMax)
            .sort((a, b) => b.amplitude - a.amplitude); // Sort by amplitude descending
        
        // Apply minimum ratio constraint
        let selected = [];
        for (const candidate of candidates) {
            if (selected.length >= targetCount) break;
            if (selected.every(sel => Math.max(candidate.frequency, sel) / Math.min(candidate.frequency, sel) >= minRatio)) {
                selected.push(candidate.frequency);
            }
        }
        
        return selected.sort((a, b) => a - b); // Return sorted by frequency
    }

    // Normal case: scan for roughness minima
    const curve = scanRoughness(primarySeries, secondarySeriesArr, {
        rangeOctaves,
        granularityCents
    });
    if (!curve.length) return [];

    // Find local minima
    function isLocalMin(idx) {
        const prev = curve[idx-1]?.totalRoughness ?? Infinity;
        const next = curve[idx+1]?.totalRoughness ?? Infinity;
        return curve[idx].totalRoughness < prev && curve[idx].totalRoughness < next;
    }
    let localMinima = [];
    for (let i = 1; i < curve.length-1; i++) {
        if (isLocalMin(i)) {
            localMinima.push(curve[i]);
        }
    }

    // If no local minima found, use global minima
    if (localMinima.length === 0) {
        const minRoughness = Math.min(...curve.map(pt => pt.totalRoughness));
        localMinima = curve.filter(pt => pt.totalRoughness === minRoughness);
    }

    // Sort by roughness
    localMinima.sort((a, b) => a.totalRoughness - b.totalRoughness);

    // Select minima with minRatio constraint
    let selected = [];
    for (const min of localMinima) {
        if (selected.length >= targetCount) break;
        if (selected.every(sel => Math.max(min.fundamental, sel.fundamental) / Math.min(min.fundamental, sel.fundamental) >= minRatio)) {
            selected.push(min);
        }
    }

    // Refine each selected minimum
    let refined = [];
    for (const min of selected) {
        const centerFund = min.fundamental;
        const minRefineFund = centerFund * Math.pow(2, -refineRangeCents/2400);
        const maxRefineFund = centerFund * Math.pow(2, refineRangeCents/2400);
        const refineOptions = {
            rangeOctaves: Math.log2(maxRefineFund/minRefineFund),
            granularityCents: refineGranularityCents
        };
        const refinedCurve = scanRoughness(
            primarySeries,
            secondarySeriesArr,
            Object.assign({}, refineOptions, {
                centerFundamental: centerFund
            })
        );
        // Find refined minimum
        let refinedMinVal = null;
        let refinedMinRough = Infinity;
        for (const pt of refinedCurve) {
            if (pt.totalRoughness < refinedMinRough) {
                refinedMinRough = pt.totalRoughness;
                refinedMinVal = pt;
            }
        }
        if (refinedMinVal) refined.push(refinedMinVal.fundamental);
    }
    return refined;
}

/**
 * Calculate total weighted roughness between all note pairs from distinct instruments
 * @param {Array} instrumentCollection - Array of objects with {absoluteSeries, scaleNotes}
 * @returns {number} Total weighted roughness
 */
function calculateCollectionRoughness(instrumentCollection) {
    let totalRoughness = 0;
    
    // Helper function for threshold (same as in scanRoughness)
    function getThreshold(f) {
        const sharpness = 0.24 / (0.021 * f + 19);
        return sharpness * 0.5;
    }
    
    // For each pair of instruments
    for (let i = 0; i < instrumentCollection.length; i++) {
        for (let j = i + 1; j < instrumentCollection.length; j++) {
            const inst1 = instrumentCollection[i];
            const inst2 = instrumentCollection[j];
            
            // For each note pair between these instruments
            for (const note1 of inst1.scaleNotes) {
                for (const note2 of inst2.scaleNotes) {
                    // Shift overtone series to these note frequencies
                    const fund1 = Math.min(...inst1.absoluteSeries.map(ot => ot.frequency));
                    const fund2 = Math.min(...inst2.absoluteSeries.map(ot => ot.frequency));
                    
                    const shifted1 = inst1.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (note1 / fund1),
                        amplitude: ot.amplitude
                    }));
                    const shifted2 = inst2.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (note2 / fund2),
                        amplitude: ot.amplitude
                    }));
                    
                    // Calculate roughness between all overtone pairs within threshold
                    const allOvertones1 = shifted1;
                    const allOvertones2 = shifted2;
                    
                    for (const ot1 of allOvertones1) {
                        for (const ot2 of allOvertones2) {
                            const dist = Math.abs(ot1.frequency - ot2.frequency);
                            const threshold = getThreshold(Math.min(ot1.frequency, ot2.frequency));
                            if (dist <= threshold) {
                                const r = roughness(ot1.frequency, ot2.frequency);
                                totalRoughness += r * ot1.amplitude * ot2.amplitude;
                            }
                        }
                    }
                }
            }
        }
    }
    return totalRoughness;
}

/**
 * Calculate average roughness for each note in each instrument's scale
 * @param {Array} instrumentCollection - Array of objects with {absoluteSeries, scaleNotes}
 * @returns {Array} Array of objects with {instrumentIndex, noteFreq, avgRoughness}
 */
function calculateNoteRoughnessAverages(instrumentCollection) {
    const noteRoughness = [];
    
    // Helper function for threshold (same as in scanRoughness)
    function getThreshold(f) {
        const sharpness = 0.24 / (0.021 * f + 19);
        return sharpness * 0.5;
    }
    
    // For each instrument
    for (let instIdx = 0; instIdx < instrumentCollection.length; instIdx++) {
        const inst = instrumentCollection[instIdx];
        const fund = Math.min(...inst.absoluteSeries.map(ot => ot.frequency));
        
        // For each note in this instrument's scale
        for (const noteFreq of inst.scaleNotes) {
            let totalRoughness = 0;
            let pairCount = 0;
            
            // Shift this instrument's overtones to this note
            const shiftedInst = inst.absoluteSeries.map(ot => ({
                frequency: ot.frequency * (noteFreq / fund),
                amplitude: ot.amplitude
            }));
            
            // Compare against all notes from other instruments
            for (let otherIdx = 0; otherIdx < instrumentCollection.length; otherIdx++) {
                if (otherIdx === instIdx) continue; // Skip same instrument
                
                const otherInst = instrumentCollection[otherIdx];
                const otherFund = Math.min(...otherInst.absoluteSeries.map(ot => ot.frequency));
                
                for (const otherNoteFreq of otherInst.scaleNotes) {
                    // Shift other instrument's overtones to this note
                    const shiftedOther = otherInst.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (otherNoteFreq / otherFund),
                        amplitude: ot.amplitude
                    }));
                    
                    // Calculate roughness between overtone pairs
                    let noteRoughness = 0;
                    for (const ot1 of shiftedInst) {
                        for (const ot2 of shiftedOther) {
                            const dist = Math.abs(ot1.frequency - ot2.frequency);
                            const threshold = getThreshold(Math.min(ot1.frequency, ot2.frequency));
                            if (dist <= threshold) {
                                const r = roughness(ot1.frequency, ot2.frequency);
                                noteRoughness += r * ot1.amplitude * ot2.amplitude;
                            }
                        }
                    }
                    totalRoughness += noteRoughness;
                    pairCount++;
                }
            }
            
            const avgRoughness = pairCount > 0 ? totalRoughness / pairCount : 0;
            noteRoughness.push({
                instrumentIndex: instIdx,
                noteFreq: noteFreq,
                avgRoughness: avgRoughness
            });
        }
    }
    
    return noteRoughness;
}

/**
 * Thin scales by removing roughest notes until target count is reached
 * @param {Array} instrumentCollection - Array of objects with {absoluteSeries, scaleNotes}
 * @param {number} targetNotes - Target number of notes per instrument
 * @returns {Array} Updated instrumentCollection with thinned scaleNotes
 */
function thinScales(instrumentCollection, targetNotes = 7) {
    // Calculate average roughness for all notes
    const noteRoughness = calculateNoteRoughnessAverages(instrumentCollection);
    
    // Group by instrument
    const byInstrument = {};
    noteRoughness.forEach(note => {
        if (!byInstrument[note.instrumentIndex]) {
            byInstrument[note.instrumentIndex] = [];
        }
        byInstrument[note.instrumentIndex].push(note);
    });
    
    // Create result array
    const result = instrumentCollection.map(inst => ({
        absoluteSeries: inst.absoluteSeries,
        scaleNotes: [...inst.scaleNotes] // Copy array
    }));
    
    // Thin each instrument's scale
    Object.keys(byInstrument).forEach(instIdx => {
        const notes = byInstrument[instIdx];
        const instIndex = parseInt(instIdx);
        
        if (notes.length <= targetNotes) return; // Already at or below target
        
        // Sort by roughness (ascending - keep least rough)
        notes.sort((a, b) => a.avgRoughness - b.avgRoughness);
        
        // Keep only the least rough notes
        const keptNotes = notes.slice(0, targetNotes).map(note => note.noteFreq);
        result[instIndex].scaleNotes = keptNotes;
    });
    
    return result;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        roughness, 
        scanRoughness, 
        findMinRoughnessFundamental, 
        findScale,
        calculateCollectionRoughness,
        calculateNoteRoughnessAverages,
        thinScales
    };
}
