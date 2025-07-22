/**
 * Test file for InstCollection with various instrument configurations
 */

const { InstCollection } = require('./instCollection');
const { calculateCollectionRoughness, calculateNoteRoughnessAverages, thinScales } = require('./roughness');

function testInstCollection() {
    console.log('=== Testing InstCollection with Varied Instruments ===\n');
    
    // Define three varied instrument configurations
    const lowParams = {
        fundamental: 110, // Low A
        harmonicPurity: 0.9,     // Nearly harmonic
        spectralBalance: 0.3,    // Fundamental emphasis
        oddEvenBias: 0.4,        // Slight even harmonic preference
        formantStrength: 0.2,    // Mild formants
        spectralRichness: 0.6,   // Moderate richness
        irregularity: 0.1,       // Very slight irregularity
        maxHarmonics: 16
    };
    
    const midParams = {
        fundamental: 220, // A above
        harmonicPurity: 0.6,     // Bell-like characteristics
        spectralBalance: 0.6,    // Higher harmonic emphasis
        oddEvenBias: 0.7,        // Odd harmonic preference
        formantStrength: 0.5,    // Moderate formants
        spectralRichness: 0.8,   // Rich spectrum
        irregularity: 0.3,       // Some irregularity
        maxHarmonics: 20
    };
    
    const highParams = {
        fundamental: 440, // Concert A
        harmonicPurity: 0.8,     // Mostly harmonic
        spectralBalance: 0.8,    // High frequency emphasis
        oddEvenBias: 0.6,        // Mixed odd/even
        formantStrength: 0.7,    // Strong formants
        spectralRichness: 0.4,   // More focused spectrum
        irregularity: 0.2,       // Slight irregularity
        maxHarmonics: 24
    };
    
    try {
        // Create instrument collection
        console.log('Creating InstCollection with roughness-optimized fundamentals...');
        const collection = new InstCollection(lowParams, midParams, highParams);
        
        // Show the optimized fundamentals
        console.log(`Low fundamental: ${collection.low.fundamental.toFixed(2)} Hz`);
        console.log(`Mid fundamental: ${collection.mid.fundamental.toFixed(2)} Hz`);
        console.log(`High fundamental: ${collection.high.fundamental.toFixed(2)} Hz\n`);
        
        // Generate scales for each instrument
        console.log('Generating scales using roughness minimization...');
        const scaleOptions = {
            rangeOctaves: 1.5,
            granularityCents: 10,
            minRatio: Math.pow(2, 80/1200), // ~80 cents minimum
            targetCount: 8,
            refineRangeCents: 15,
            refineGranularityCents: 1
        };
        
        collection.generateScales(scaleOptions);
        
        // Display generated scales
        console.log('\n=== Generated Scales ===');
        console.log('Low instrument notes (Hz):');
        collection.lowNotes.forEach((freq, i) => {
            console.log(`  ${i+1}: ${freq.toFixed(2)} Hz`);
        });
        
        console.log('\nMid instrument notes (Hz):');
        collection.midNotes.forEach((freq, i) => {
            console.log(`  ${i+1}: ${freq.toFixed(2)} Hz`);
        });
        
        console.log('\nHigh instrument notes (Hz):');
        collection.highNotes.forEach((freq, i) => {
            console.log(`  ${i+1}: ${freq.toFixed(2)} Hz`);
        });
        
        // Prepare data for roughness analysis
        const instrumentData = [
            {
                absoluteSeries: collection.low.absoluteSeries,
                scaleNotes: collection.lowNotes
            },
            {
                absoluteSeries: collection.mid.absoluteSeries,
                scaleNotes: collection.midNotes
            },
            {
                absoluteSeries: collection.high.absoluteSeries,
                scaleNotes: collection.highNotes
            }
        ];
        
        // Calculate total collection roughness
        console.log('\n=== Roughness Analysis ===');
        const totalRoughness = calculateCollectionRoughness(instrumentData);
        console.log(`Total collection roughness: ${totalRoughness.toFixed(4)}`);
        
        // Calculate average roughness per note
        console.log('\n=== Note Roughness Averages ===');
        const noteRoughness = calculateNoteRoughnessAverages(instrumentData);
        const instNames = ['Low', 'Mid', 'High'];
        
        noteRoughness.forEach(note => {
            const instName = instNames[note.instrumentIndex];
            console.log(`${instName} ${note.noteFreq.toFixed(2)} Hz: avg roughness ${note.avgRoughness.toFixed(4)}`);
        });
        
        // Test scale thinning
        console.log('\n=== Scale Thinning Test ===');
        console.log('Thinning scales to 5 notes each...');
        const thinnedScales = thinScales(instrumentData, 5);
        
        thinnedScales.forEach((inst, idx) => {
            const instName = instNames[idx];
            console.log(`${instName} thinned notes (${inst.scaleNotes.length}):`);
            inst.scaleNotes.forEach((freq, i) => {
                console.log(`  ${i+1}: ${freq.toFixed(2)} Hz`);
            });
        });
        
        // Calculate roughness after thinning
        const thinnedRoughness = calculateCollectionRoughness(thinnedScales);
        console.log(`\nRoughness after thinning: ${thinnedRoughness.toFixed(4)}`);
        console.log(`Roughness reduction: ${((totalRoughness - thinnedRoughness) / totalRoughness * 100).toFixed(1)}%`);
        
        console.log('\n=== Test Completed Successfully ===');
        
    } catch (error) {
        console.error('Error during test:', error.message);
        console.error(error.stack);
    }
}

// Run the test
if (require.main === module) {
    testInstCollection();
}

module.exports = { testInstCollection };
