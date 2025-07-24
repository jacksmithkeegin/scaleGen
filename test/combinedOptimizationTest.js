const { buildAndOptimizeScales, buildScalesFromOvertones } = require('../buildScale.js');
const { generateOvertonesArrays } = require('../overtoneGen.js');

console.log('\n=== Combined Optimization Test ===');

// Create test overtone series representing different instruments
const instruments = [
    { name: "Flute-like", fundamental: 261.63, harmonicPurity: 1.0, spectralRichness: 0.1, irregularity: 0.0 },
    { name: "Violin-like", fundamental: 329.63, harmonicPurity: 0.9, spectralRichness: 0.3, irregularity: 0.1 },
    { name: "Trumpet-like", fundamental: 392.00, harmonicPurity: 0.8, spectralRichness: 0.4, irregularity: 0.15 },
    { name: "Clarinet-like", fundamental: 523.25, harmonicPurity: 0.85, spectralRichness: 0.25, irregularity: 0.05 }
];

const numPartials = 8;

console.log('Creating overtone series for instruments:');
instruments.forEach(inst => {
    console.log(`  ${inst.name}: ${inst.fundamental} Hz`);
});

// Generate overtone series for each instrument
const overtoneSeries = instruments.map(inst => {
    const overtoneArrays = generateOvertonesArrays(
        inst.harmonicPurity,
        0.5,  // spectralBalance
        0.5,  // oddEvenBias (no bias toward odd/even harmonics)
        0.0,  // formantStrength
        inst.spectralRichness,
        inst.irregularity,
        numPartials
    );
    
    const freq = overtoneArrays.ratios.map(r => r * inst.fundamental);
    const amp = overtoneArrays.amplitudes;
    
    return { freq, amp };
});

// Scale generation parameters
const minNotes = 8;      // Minimum notes in initial scales
const minRatio = 1.04;   // Minimum ratio between successive notes (about 69 cents)
const targetNotes = 6;   // Target notes in final optimized scales
const maxNotes = 20;     // Maximum notes in initial scales (gives more candidates)

console.log(`\nScale parameters:`);
console.log(`  Initial scales: ${minNotes}-${maxNotes} notes, min ratio: ${minRatio}`);
console.log(`  Final scales: ${targetNotes} notes each (optimized)`);

// Compare non-optimized vs optimized results
console.log('\n--- Comparison: Standard vs Optimized ---');

console.log('\n1. Standard Scale Building (individual optimization):');
const standardScales = buildScalesFromOvertones(overtoneSeries, minNotes, minRatio, targetNotes);

console.log('\n2. Combined Optimization (cross-scale dissonance analysis):');
const optimizedScales = buildAndOptimizeScales(overtoneSeries, minNotes, minRatio, targetNotes, maxNotes);

// Display comparison
console.log('\n=== Results Comparison ===');

for (let i = 0; i < instruments.length; i++) {
    const instrument = instruments[i];
    const standardScale = standardScales[i];
    const optimizedScale = optimizedScales[i];
    
    console.log(`\n--- ${instrument.name} (${instrument.fundamental} Hz) ---`);
    
    console.log('\nStandard Scale:');
    console.log('  Note | Frequency  | Ratio    | Cents    | Individual Diss');
    console.log('  -----|------------|----------|----------|----------------');
    standardScale.forEach((note, idx) => {
        const cents = Math.log2(note.ratio) * 1200;
        const noteNum = String(idx + 1).padEnd(4);
        const freq = note.frequency.toFixed(2).padEnd(10);
        const ratio = note.ratio.toFixed(4).padEnd(8);
        const centsStr = cents.toFixed(1).padEnd(8);
        const diss = note.dissonance.toFixed(4);
        console.log(`  ${noteNum} | ${freq} | ${ratio} | ${centsStr} | ${diss}`);
    });
    
    console.log('\nOptimized Scale:');
    console.log('  Note | Frequency  | Ratio    | Cents    | Individual Diss | Combined Diss');
    console.log('  -----|------------|----------|----------|-----------------|---------------');
    optimizedScale.forEach((note, idx) => {
        const cents = Math.log2(note.ratio) * 1200;
        const noteNum = String(idx + 1).padEnd(4);
        const freq = note.frequency.toFixed(2).padEnd(10);
        const ratio = note.ratio.toFixed(4).padEnd(8);
        const centsStr = cents.toFixed(1).padEnd(8);
        const indivDiss = note.dissonance.toFixed(4).padEnd(15);
        const combDiss = note.combinedDissonance.toFixed(4);
        console.log(`  ${noteNum} | ${freq} | ${ratio} | ${centsStr} | ${indivDiss} | ${combDiss}`);
    });
    
    // Calculate some statistics
    const standardAvgDiss = standardScale.reduce((sum, note) => sum + note.dissonance, 0) / standardScale.length;
    const optimizedAvgIndivDiss = optimizedScale.reduce((sum, note) => sum + note.dissonance, 0) / optimizedScale.length;
    const optimizedAvgCombDiss = optimizedScale.reduce((sum, note) => sum + note.combinedDissonance, 0) / optimizedScale.length;
    
    console.log(`\n  Statistics:`);
    console.log(`    Standard scale avg individual dissonance: ${standardAvgDiss.toFixed(4)}`);
    console.log(`    Optimized scale avg individual dissonance: ${optimizedAvgIndivDiss.toFixed(4)}`);
    console.log(`    Optimized scale avg combined dissonance: ${optimizedAvgCombDiss.toFixed(4)}`);
    
    // Note changes
    const standardFreqs = new Set(standardScale.map(n => n.frequency.toFixed(2)));
    const optimizedFreqs = new Set(optimizedScale.map(n => n.frequency.toFixed(2)));
    const kept = optimizedScale.filter(n => standardFreqs.has(n.frequency.toFixed(2))).length;
    console.log(`    Notes kept from standard scale: ${kept}/${targetNotes}`);
}

console.log('\n=== Combined Optimization Test Complete ===');