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

    // Get current fundamental from primary series (lowest frequency)
    const fundamental = Math.min(...primarySeries.map(ot => ot.frequency));

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

    // Scan coarse curve
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { roughness, scanRoughness, findMinRoughnessFundamental, findScale };
}
