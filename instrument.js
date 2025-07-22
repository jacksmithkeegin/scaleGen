const { generateOvertones, ratiosToFrequencies } = require('./overtoneGen');

/**
 * Instrument class with overtone series
 */
class Instrument {
    /**
     * @param {number} fundamental - Fundamental frequency in Hz
     * @param {number} harmonicPurity - 0=bell, 1=harmonic series
     * @param {number} spectralBalance - 0=fundamental only, 1=high harmonic emphasis
     * @param {number} oddEvenBias - 0=even, 1=odd
     * @param {number} formantStrength - 0=no formant, 1=strong formant
     * @param {number} spectralRichness - 0=few harmonics, 1=many harmonics
     * @param {number} irregularity - 0=perfect ratios, 1=perturbed
     * @param {number} maxHarmonics - Number of harmonics (default: 32)
     */
    constructor(fundamental, harmonicPurity, spectralBalance, oddEvenBias, formantStrength, spectralRichness, irregularity, maxHarmonics = 32) {
        this.fundamental = fundamental;
        this.harmonicPurity = harmonicPurity;
        this.spectralBalance = spectralBalance;
        this.oddEvenBias = oddEvenBias;
        this.formantStrength = formantStrength;
        this.spectralRichness = spectralRichness;
        this.irregularity = irregularity;
        this.maxHarmonics = maxHarmonics;

        // Generate overtone series (relative ratios and amplitudes)
        this.overtoneSeries = generateOvertones(
            harmonicPurity,
            spectralBalance,
            oddEvenBias,
            formantStrength,
            spectralRichness,
            irregularity,
            maxHarmonics
        );

        // Absolute frequencies and amplitudes
        this.absoluteSeries = this.overtoneSeries.map(ot => ({
            frequency: ot.ratio * fundamental,
            amplitude: ot.amplitude,
            harmonic: ot.harmonic
        }));
    }

    /**
     * Visualize the overtone series in the console (absolute frequencies)
     */
    visualize() {
        console.log(`Instrument: fundamental = ${this.fundamental} Hz`);
        console.log('Harmonic | Frequency (Hz) | Amplitude');
        this.absoluteSeries.forEach(ot => {
            console.log(`   H${ot.harmonic}    |  ${ot.frequency.toFixed(2)}      |  ${ot.amplitude.toFixed(3)}`);
        });
    }
}

// Export the Instrument class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Instrument };
}
