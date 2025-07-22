const { Instrument } = require('./instrument');

/**
 * InstCollection holds three Instrument instances: low, mid, high
 */
class InstCollection {
    /**
     * @param {Object} lowParams - Params for low instrument (must include fundamental)
     * @param {Object} midParams - Params for mid instrument (must include fundamental)
     * @param {Object} highParams - Params for high instrument (must include fundamental)
     */
    constructor(lowParams, midParams, highParams) {
        // Get initial fundamentals
        let fLow = lowParams.fundamental;
        let fMid = midParams.fundamental;
        let fHigh = highParams.fundamental;

        // Create low instrument first
        this.low = new Instrument(
            fLow,
            lowParams.harmonicPurity,
            lowParams.spectralBalance,
            lowParams.oddEvenBias,
            lowParams.formantStrength,
            lowParams.spectralRichness,
            lowParams.irregularity,
            lowParams.maxHarmonics || 32
        );

        // Find overtone of low closest to mid fundamental, weighted by amplitude
        const lowOvertones = this.low.absoluteSeries;
        let bestMid = fMid;
        let minDistMid = Infinity;
        lowOvertones.forEach(ot => {
            const dist = Math.abs(ot.frequency - fMid) / ot.amplitude;
            if (dist < minDistMid) {
                minDistMid = dist;
                bestMid = ot.frequency;
            }
        });
        fMid = bestMid;

        // Create mid instrument
        this.mid = new Instrument(
            fMid,
            midParams.harmonicPurity,
            midParams.spectralBalance,
            midParams.oddEvenBias,
            midParams.formantStrength,
            midParams.spectralRichness,
            midParams.irregularity,
            midParams.maxHarmonics || 32
        );

        // Find overtone of mid closest to high fundamental, weighted by amplitude
        const midOvertones = this.mid.absoluteSeries;
        let bestHigh = fHigh;
        let minDistHigh = Infinity;
        midOvertones.forEach(ot => {
            const dist = Math.abs(ot.frequency - fHigh) / ot.amplitude;
            if (dist < minDistHigh) {
                minDistHigh = dist;
                bestHigh = ot.frequency;
            }
        });
        fHigh = bestHigh;

        // Check fundamentals are ascending
        if (!(fLow < fMid && fMid < fHigh)) {
            throw new Error('Fundamental frequencies must be strictly ascending after rounding: low < mid < high');
        }

        // Create high instrument
        this.high = new Instrument(
            fHigh,
            highParams.harmonicPurity,
            highParams.spectralBalance,
            highParams.oddEvenBias,
            highParams.formantStrength,
            highParams.spectralRichness,
            highParams.irregularity,
            highParams.maxHarmonics || 32
        );
    }

    /**
     * Return the three overtone series (absolute frequencies and amplitudes)
     * @returns {Object} { low: Array, mid: Array, high: Array }
     */
    getOvertoneSeries() {
        return {
            low: this.low.absoluteSeries,
            mid: this.mid.absoluteSeries,
            high: this.high.absoluteSeries
        };
    }

    /**
     * Visualize the three overtone series together in the console
     */
    visualizeAll() {
        console.log('=== Low Instrument ===');
        this.low.visualize();
        console.log('\n=== Mid Instrument ===');
        this.mid.visualize();
        console.log('\n=== High Instrument ===');
        this.high.visualize();
    }
}

// Export the InstCollection class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InstCollection };
}
