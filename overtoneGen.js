/**
 * Overtone Series Generator
 * Generates frequency ratios and amplitudes based on various spectral parameters
 * All parameters are in range [0,1] and the output is deterministic and continuous
 */

/**
 * Generate overtone series with specified characteristics
 * @param {number} harmonicPurity - 0=bell-like (stretched partials), 1=perfect harmonic series
 * @param {number} spectralBalance - 0=fundamental only, 1=high harmonic emphasis  
 * @param {number} oddEvenBias - 0=even harmonics emphasized, 1=odd harmonics emphasized
 * @param {number} formantStrength - 0=no formant peaks, 1=strong formant resonances
 * @param {number} spectralRichness - 0=few harmonics, 1=many harmonics with high amplitude
 * @param {number} irregularity - 0=perfect ratios, 1=perturbed from ideal ratios
 * @param {number} maxHarmonics - Maximum number of harmonics to generate (default: 32)
 * @returns {Array} Array of {ratio, amplitude} objects
 */
function generateOvertones(harmonicPurity = 1.0, spectralBalance = 0.5, oddEvenBias = 0.5, 
                          formantStrength = 0.0, spectralRichness = 0.5, irregularity = 0.0, 
                          maxHarmonics = 32) {
    
    // Validate inputs
    const params = [harmonicPurity, spectralBalance, oddEvenBias, formantStrength, spectralRichness, irregularity];
    params.forEach(param => {
        if (param < 0 || param > 1) {
            throw new Error('All parameters must be in range [0, 1]');
        }
    });

    const overtones = [];
    
    // Formant frequencies (relative to fundamental) for vowel-like resonances
    const formantCenters = [1.0, 2.4, 3.8, 5.2, 7.1, 9.3, 12.1, 15.4];
    
    for (let n = 1; n <= maxHarmonics; n++) {
        // Base harmonic ratio
        let ratio = n;
        
        // Apply harmonic purity (bell-like stretching vs perfect harmonics)
        // Bell-like instruments have stretched partials that deviate from integer multiples
        const stretchFactor = 1 + (1 - harmonicPurity) * 0.1 * Math.pow(n - 1, 1.3);
        ratio *= stretchFactor;
        
        // Apply irregularity (deterministic perturbation based on harmonic number)
        if (irregularity > 0) {
            // Use sine waves based on harmonic number for deterministic perturbation
            const perturbation = Math.sin(n * 2.847) * Math.sin(n * 1.618) * irregularity * 0.05;
            ratio *= (1 + perturbation);
        }
        
        // Calculate base amplitude using spectral balance
        // Higher spectralBalance emphasizes higher harmonics
        let amplitude;
        if (spectralBalance < 0.5) {
            // Emphasize lower harmonics
            amplitude = Math.pow(1 / n, 1 - spectralBalance * 2);
        } else {
            // More balanced or higher harmonic emphasis
            const rolloff = 0.5 + (spectralBalance - 0.5) * 1.0;
            amplitude = Math.pow(1 / n, rolloff);
        }
        
        // Apply odd/even bias
        const isOdd = (n % 2 === 1);
        const oddEvenMultiplier = isOdd ? 
            (0.5 + oddEvenBias * 0.5) : 
            (1.5 - oddEvenBias * 0.5);
        amplitude *= oddEvenMultiplier;
        
        // Apply formant resonances
        if (formantStrength > 0) {
            let formantBoost = 1.0;
            
            // Check proximity to formant centers
            formantCenters.forEach(formantCenter => {
                const distance = Math.abs(ratio - formantCenter);
                const formantWidth = 0.8; // Bandwidth of formant resonance
                
                if (distance < formantWidth) {
                    // Gaussian-like formant resonance
                    const resonance = Math.exp(-Math.pow(distance / (formantWidth * 0.4), 2));
                    formantBoost += formantStrength * resonance * 2.0;
                }
            });
            
            amplitude *= formantBoost;
        }
        
        // Apply spectral richness (affects amplitude of higher harmonics)
        const richnessMultiplier = 1 + spectralRichness * (0.5 - Math.pow(1/n, 0.3));
        amplitude *= richnessMultiplier;
        
        // Ensure amplitude is positive and apply gentle smoothing
        amplitude = Math.max(0.001, amplitude);
        
        overtones.push({
            ratio: ratio,
            amplitude: amplitude,
            harmonic: n
        });
    }
    
    // Normalize amplitudes so the fundamental has amplitude 1.0
    const fundamentalAmp = overtones[0].amplitude;
    overtones.forEach(overtone => {
        overtone.amplitude /= fundamentalAmp;
    });
    
    return overtones;
}

/**
 * Generate overtone series and return as separate arrays for ratios and amplitudes
 * @param {number} harmonicPurity 
 * @param {number} spectralBalance 
 * @param {number} oddEvenBias 
 * @param {number} formantStrength 
 * @param {number} spectralRichness 
 * @param {number} irregularity 
 * @param {number} maxHarmonics 
 * @returns {Object} {ratios: Array, amplitudes: Array}
 */
function generateOvertonesArrays(harmonicPurity = 1.0, spectralBalance = 0.5, oddEvenBias = 0.5, 
                                formantStrength = 0.0, spectralRichness = 0.5, irregularity = 0.0, 
                                maxHarmonics = 32) {
    
    const overtones = generateOvertones(harmonicPurity, spectralBalance, oddEvenBias, 
                                       formantStrength, spectralRichness, irregularity, maxHarmonics);
    
    return {
        ratios: overtones.map(ot => ot.ratio),
        amplitudes: overtones.map(ot => ot.amplitude)
    };
}

/**
 * Utility function to convert ratios to frequencies given a fundamental frequency
 * @param {Array} ratios - Array of frequency ratios
 * @param {number} fundamental - Fundamental frequency in Hz
 * @returns {Array} Array of frequencies in Hz
 */
function ratiosToFrequencies(ratios, fundamental = 440) {
    return ratios.map(ratio => ratio * fundamental);
}

/**
 * Example usage and test function
 */
function runExamples() {
    console.log('=== Overtone Series Generator Examples ===\n');
    
    // Perfect harmonic series
    console.log('1. Perfect Harmonic Series:');
    const perfect = generateOvertones(1.0, 0.3, 0.5, 0.0, 0.3, 0.0, 8);
    perfect.forEach((ot, i) => {
        console.log(`  H${i+1}: ${ot.ratio.toFixed(3)}x, amp: ${ot.amplitude.toFixed(3)}`);
    });
    
    // Bell-like spectrum
    console.log('\n2. Bell-like Spectrum (stretched partials):');
    const bell = generateOvertones(0.0, 0.8, 0.3, 0.0, 0.7, 0.2, 8);
    bell.forEach((ot, i) => {
        console.log(`  H${i+1}: ${ot.ratio.toFixed(3)}x, amp: ${ot.amplitude.toFixed(3)}`);
    });
    
    // Vowel-like with formants
    console.log('\n3. Vowel-like with Formants:');
    const vowel = generateOvertones(0.9, 0.4, 0.7, 0.8, 0.6, 0.1, 8);
    vowel.forEach((ot, i) => {
        console.log(`  H${i+1}: ${ot.ratio.toFixed(3)}x, amp: ${ot.amplitude.toFixed(3)}`);
    });
    
    // Test arrays output
    console.log('\n4. Arrays Output Example:');
    const arrays = generateOvertonesArrays(0.8, 0.6, 0.4, 0.3, 0.5, 0.1, 6);
    console.log('  Ratios:', arrays.ratios.map(r => r.toFixed(3)));
    console.log('  Amplitudes:', arrays.amplitudes.map(a => a.toFixed(3)));
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateOvertones,
        generateOvertonesArrays,
        ratiosToFrequencies
    };
}

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples();
}
