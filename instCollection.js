
const { Instrument } = require('./instrument');
const { findMinRoughnessFundamental } = require('./roughness');

/**
 * InstCollection holds three Instrument instances: low, mid, high
 */
class InstCollection {

    /**
     * Generate and store note frequencies for each instrument using roughness-based scale finding
     * Stores: this.lowNotes, this.midNotes, this.highNotes
     * @param {Object} options - Options for scale finding (minRatio, targetCount, etc)
     */
    generateScales(options = {}) {
        const { findScale } = require('./roughness');

        // Low instrument
        this.lowNotes = findScale(
            this.low.absoluteSeries,
            [], // no secondary
            options
        );

        // Mid instrument
        this.midNotes = findScale(
            this.mid.absoluteSeries,
            [this.low.absoluteSeries],
            options
        );

        // High instrument
        this.highNotes = findScale(
            this.high.absoluteSeries,
            [this.mid.absoluteSeries],
            options
        );
    }
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

        // Use roughness minimization to select mid fundamental
        const lowSeries = this.low.absoluteSeries;
        const midSeriesTemplate = {
            harmonicPurity: midParams.harmonicPurity,
            spectralBalance: midParams.spectralBalance,
            oddEvenBias: midParams.oddEvenBias,
            formantStrength: midParams.formantStrength,
            spectralRichness: midParams.spectralRichness,
            irregularity: midParams.irregularity,
            maxHarmonics: midParams.maxHarmonics || 32
        };
        // Generate a mid overtone series at the requested fundamental
        const tempMid = new Instrument(
            fMid,
            midSeriesTemplate.harmonicPurity,
            midSeriesTemplate.spectralBalance,
            midSeriesTemplate.oddEvenBias,
            midSeriesTemplate.formantStrength,
            midSeriesTemplate.spectralRichness,
            midSeriesTemplate.irregularity,
            midSeriesTemplate.maxHarmonics
        );
        const midTemplateSeries = tempMid.absoluteSeries;
        // Use roughness minimization
        const midResult = findMinRoughnessFundamental(
            midTemplateSeries,
            [lowSeries],
            { rangeOctaves: 0.5, granularityCents: 2, refineRangeCents: 20, refineGranularityCents: 0.2 }
        );
        fMid = midResult ? midResult.fundamental : fMid;

        // Create mid instrument at selected fundamental
        this.mid = new Instrument(
            fMid,
            midSeriesTemplate.harmonicPurity,
            midSeriesTemplate.spectralBalance,
            midSeriesTemplate.oddEvenBias,
            midSeriesTemplate.formantStrength,
            midSeriesTemplate.spectralRichness,
            midSeriesTemplate.irregularity,
            midSeriesTemplate.maxHarmonics
        );

        // Use roughness minimization to select high fundamental
        const midSeries = this.mid.absoluteSeries;
        const highSeriesTemplate = {
            harmonicPurity: highParams.harmonicPurity,
            spectralBalance: highParams.spectralBalance,
            oddEvenBias: highParams.oddEvenBias,
            formantStrength: highParams.formantStrength,
            spectralRichness: highParams.spectralRichness,
            irregularity: highParams.irregularity,
            maxHarmonics: highParams.maxHarmonics || 32
        };
        const tempHigh = new Instrument(
            fHigh,
            highSeriesTemplate.harmonicPurity,
            highSeriesTemplate.spectralBalance,
            highSeriesTemplate.oddEvenBias,
            highSeriesTemplate.formantStrength,
            highSeriesTemplate.spectralRichness,
            highSeriesTemplate.irregularity,
            highSeriesTemplate.maxHarmonics
        );
        const highTemplateSeries = tempHigh.absoluteSeries;
        const highResult = findMinRoughnessFundamental(
            highTemplateSeries,
            [midSeries],
            { rangeOctaves: 0.5, granularityCents: 2, refineRangeCents: 20, refineGranularityCents: 0.2 }
        );
        fHigh = highResult ? highResult.fundamental : fHigh;

        // Check fundamentals are ascending
        if (!(fLow < fMid && fMid < fHigh)) {
            throw new Error('Fundamental frequencies must be strictly ascending after roughness selection: low < mid < high');
        }

        // Create high instrument at selected fundamental
        this.high = new Instrument(
            fHigh,
            highSeriesTemplate.harmonicPurity,
            highSeriesTemplate.spectralBalance,
            highSeriesTemplate.oddEvenBias,
            highSeriesTemplate.formantStrength,
            highSeriesTemplate.spectralRichness,
            highSeriesTemplate.irregularity,
            highSeriesTemplate.maxHarmonics
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
