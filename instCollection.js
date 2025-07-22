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
        // Check fundamentals are ascending
        const fLow = lowParams.fundamental;
        const fMid = midParams.fundamental;
        const fHigh = highParams.fundamental;
        if (!(fLow < fMid && fMid < fHigh)) {
            throw new Error('Fundamental frequencies must be strictly ascending: low < mid < high');
        }

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
