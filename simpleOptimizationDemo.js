const { buildAndOptimizeScales, buildScalesFromOvertones } = require('./buildScale.js');
const { generateOvertonesArrays } = require('./overtoneGen.js');

console.log('\n=== Simple Combined Optimization Demo ===');

// Create a simple ensemble: C major triad instruments
const triadInstruments = [
    { name: "C (Root)", fundamental: 261.63 },      // C4
    { name: "E (Third)", fundamental: 329.63 },     // E4  
    { name: "G (Fifth)", fundamental: 392.00 }      // G4
];

const numPartials = 6;

// Generate similar overtone series for all instruments (harmonic series)
const overtoneSeries = triadInstruments.map(inst => {
    const overtoneArrays = generateOvertonesArrays(
        1.0,  // Perfect harmonic series
        0.5,  // Balanced spectral rolloff
        0.5,  // No odd/even bias
        0.0,  // No formants
        0.1,  // Slight spectral richness
        0.0,  // No irregularity
        numPartials
    );
    
    const freq = overtoneArrays.ratios.map(r => r * inst.fundamental);
    const amp = overtoneArrays.amplitudes;
    
    return { freq, amp };
});

// Scale parameters
const minNotes = 6;
const minRatio = 1.05;
const targetNotes = 4;  // Keep it small for clear comparison
const maxNotes = 12;    // More candidates for optimization

console.log('Instruments:');
triadInstruments.forEach((inst, i) => {
    console.log(`  ${inst.name}: ${inst.fundamental} Hz`);
});

console.log(`\nGenerating ${targetNotes} notes per instrument...`);

// Compare the two approaches
const optimizedScales = buildAndOptimizeScales(overtoneSeries, minNotes, minRatio, targetNotes, maxNotes);

console.log('\n=== Final Optimized Scales ===');

let totalCombinedDissonance = 0;
let totalNotes = 0;

optimizedScales.forEach((scale, i) => {
    const instrument = triadInstruments[i];
    console.log(`\n${instrument.name} Scale:`);
    console.log('  Freq(Hz) | Ratio  | Cents  | Combined Dissonance');
    console.log('  ---------|--------|--------|-------------------');
    
    scale.forEach(note => {
        const cents = Math.log2(note.ratio) * 1200;
        const freq = note.frequency.toFixed(1).padEnd(8);
        const ratio = note.ratio.toFixed(3).padEnd(6);
        const centsStr = cents.toFixed(0).padEnd(6);
        const combDiss = note.combinedDissonance.toFixed(4);
        
        console.log(`  ${freq} | ${ratio} | ${centsStr} | ${combDiss}`);
        
        totalCombinedDissonance += note.combinedDissonance;
        totalNotes++;
    });
    
    const avgCombinedDiss = scale.reduce((sum, note) => sum + note.combinedDissonance, 0) / scale.length;
    console.log(`  Average combined dissonance: ${avgCombinedDiss.toFixed(4)}`);
});

console.log(`\n=== Summary ===`);
console.log(`Total notes across all scales: ${totalNotes}`);
console.log(`Overall average combined dissonance: ${(totalCombinedDissonance / totalNotes).toFixed(4)}`);

// Show some intervals between instruments
console.log(`\n=== Cross-Instrument Intervals ===`);
console.log('Comparing fundamentals with first notes of each scale:');

for (let i = 0; i < optimizedScales.length; i++) {
    for (let j = i + 1; j < optimizedScales.length; j++) {
        const inst1 = triadInstruments[i];
        const inst2 = triadInstruments[j];
        const note1 = optimizedScales[i][0]; // First note of scale i
        const note2 = optimizedScales[j][0]; // First note of scale j
        
        const ratio = note2.frequency / note1.frequency;
        const cents = Math.log2(ratio) * 1200;
        
        console.log(`${inst1.name} to ${inst2.name}: ${ratio.toFixed(3)} (${cents.toFixed(1)} cents)`);
    }
}

console.log('\n=== Demo Complete ===');
