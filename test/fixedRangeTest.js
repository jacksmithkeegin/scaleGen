const { buildScalesFromOvertones } = require('../buildScale.js');
const { generateOvertonesArrays } = require('../overtoneGen.js');

console.log('\n=== Fixed Range Test (1 octave below to 2 octaves above) ===');

// Create test overtone series with different fundamentals
const fundamentals = [200, 300, 450]; // Different spacing to show fixed ranges
const numPartials = 6;

console.log('Testing fixed ranges with fundamentals:', fundamentals.map(f => `${f} Hz`).join(', '));

// Generate harmonic series for each fundamental
const overtoneSeries = fundamentals.map(fundamental => {
    const overtoneArrays = generateOvertonesArrays(
        1.0,  // Perfect harmonic series
        0.5,  // Balanced spectral rolloff
        0.5,  // No odd/even bias
        0.0,  // No formants
        0.0,  // No extra richness
        0.0,  // No irregularity
        numPartials
    );
    
    const freq = overtoneArrays.ratios.map(r => r * fundamental);
    const amp = overtoneArrays.amplitudes;
    
    return { freq, amp };
});

console.log('\n--- Range Analysis (Fixed: 1 octave below to 2 octaves above) ---');
fundamentals.forEach((fundamental, i) => {
    const oneOctaveBelow = fundamental * 0.5;
    const twoOctavesAbove = fundamental * 4.0;
    
    console.log(`\nSeries ${i + 1} (${fundamental} Hz):`);
    console.log(`  Range: ${oneOctaveBelow} - ${twoOctavesAbove} Hz`);
    console.log(`  Range span: ${(twoOctavesAbove / oneOctaveBelow).toFixed(1)} octaves (always 3 octaves)`);
    console.log(`  Ratio range: 0.5 - 4.0 (always the same)`);
});

// Test with different maxNotes values
const testConfigs = [
    { minNotes: 5, minRatio: 1.05, maxNotes: 12, name: "Default maxNotes=12" },
    { minNotes: 5, minRatio: 1.05, name: "Using default maxNotes=36" }, // No maxNotes specified
    { minNotes: 8, minRatio: 1.03, maxNotes: 24, name: "Custom maxNotes=24" }
];

testConfigs.forEach(config => {
    console.log(`\n--- Test: ${config.name} ---`);
    
    const scales = config.maxNotes ? 
        buildScalesFromOvertones(overtoneSeries, config.minNotes, config.minRatio, config.maxNotes) :
        buildScalesFromOvertones(overtoneSeries, config.minNotes, config.minRatio); // Use default
    
    scales.forEach((scale, seriesIndex) => {
        const fundamental = fundamentals[seriesIndex];
        console.log(`\n  Scale ${seriesIndex + 1} (${fundamental} Hz): ${scale.length} notes`);
        
        if (scale.length > 0) {
            const lowestNote = scale[0];
            const highestNote = scale[scale.length - 1];
            const spanOctaves = Math.log2(highestNote.frequency / lowestNote.frequency);
            
            console.log(`    Range: ${lowestNote.frequency.toFixed(1)} - ${highestNote.frequency.toFixed(1)} Hz`);
            console.log(`    Span: ${spanOctaves.toFixed(2)} octaves`);
            console.log(`    First 5 notes: ${scale.slice(0, 5).map(n => n.frequency.toFixed(1)).join(', ')} Hz`);
            if (scale.length > 5) {
                console.log(`    Last 5 notes: ${scale.slice(-5).map(n => n.frequency.toFixed(1)).join(', ')} Hz`);
            }
        }
    });
});

console.log('\n=== Fixed Range Test Complete ===');