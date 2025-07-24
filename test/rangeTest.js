const { buildScalesFromOvertones } = require('../buildScale.js');
const { generateOvertonesArrays } = require('../overtoneGen.js');

console.log('\n=== Range Calculation Demonstration ===');

// Create a simple test with clear fundamentals to show the range logic
const fundamentals = [100, 200, 350, 500]; // Clear progression
const numPartials = 6;

console.log('Testing range calculation with fundamentals:', fundamentals.map(f => `${f} Hz`).join(', '));

// Generate simple harmonic series for each fundamental
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

console.log('\n--- Range Calculation Analysis ---');
for (let i = 0; i < overtoneSeries.length; i++) {
    const currentFundamental = fundamentals[i];
    const oneOctaveBelow = currentFundamental * 0.5;
    const oneOctaveAbove = currentFundamental * 2.0;
    
    let rangeEnd;
    let rangeDescription;
    
    if (i < overtoneSeries.length - 1) {
        const nextFundamental = fundamentals[i + 1];
        rangeEnd = Math.max(nextFundamental, oneOctaveAbove);
        rangeDescription = `max(next fundamental: ${nextFundamental} Hz, one octave above: ${oneOctaveAbove} Hz) = ${rangeEnd} Hz`;
    } else {
        rangeEnd = oneOctaveAbove;
        rangeDescription = `one octave above: ${oneOctaveAbove} Hz (last series)`;
    }
    
    console.log(`\nSeries ${i + 1} (${currentFundamental} Hz):`);
    console.log(`  Range start: ${oneOctaveBelow} Hz (one octave below)`);
    console.log(`  Range end: ${rangeDescription}`);
    console.log(`  Final range: ${oneOctaveBelow} - ${rangeEnd} Hz`);
    console.log(`  Range span: ${(rangeEnd / oneOctaveBelow).toFixed(2)} octaves`);
}

// Generate scales with minimal constraints to see the range effect clearly
const minNotes = 3;
const minRatio = 1.10; // Larger minimum ratio for clearer separation
const maxNotes = 6;

console.log(`\n--- Generating Scales with Minimal Constraints ---`);
console.log(`Scale parameters: ${minNotes}-${maxNotes} notes, min ratio: ${minRatio}`);

const scales = buildScalesFromOvertones(overtoneSeries, minNotes, minRatio, maxNotes);

console.log('\n=== Generated Scales (showing range effects) ===');

scales.forEach((scale, seriesIndex) => {
    const fundamental = fundamentals[seriesIndex];
    console.log(`\n--- Scale ${seriesIndex + 1} (${fundamental} Hz fundamental) ---`);
    
    if (scale.length === 0) {
        console.log('  No scale generated');
        return;
    }
    
    console.log('  Note | Frequency  | Ratio    | Position in Range');
    console.log('  -----|------------|----------|------------------');
    
    // Calculate the actual search range for context
    const oneOctaveBelow = fundamental * 0.5;
    let rangeEnd;
    if (seriesIndex < fundamentals.length - 1) {
        const nextFundamental = fundamentals[seriesIndex + 1];
        rangeEnd = Math.max(nextFundamental, fundamental * 2.0);
    } else {
        rangeEnd = fundamental * 2.0;
    }
    
    scale.forEach((note, noteIndex) => {
        const noteNum = String(noteIndex + 1).padEnd(4);
        const freq = note.frequency.toFixed(2).padEnd(10);
        const ratio = note.ratio.toFixed(4).padEnd(8);
        
        // Show where in the range this note falls
        const positionInRange = (note.frequency - oneOctaveBelow) / (rangeEnd - oneOctaveBelow);
        const position = `${(positionInRange * 100).toFixed(1)}% through range`;
        
        console.log(`  ${noteNum} | ${freq} | ${ratio} | ${position}`);
    });
    
    console.log(`  \n  Range: ${oneOctaveBelow.toFixed(1)} - ${rangeEnd.toFixed(1)} Hz`);
    console.log(`  Lowest note: ${scale[0].frequency.toFixed(2)} Hz`);
    console.log(`  Highest note: ${scale[scale.length-1].frequency.toFixed(2)} Hz`);
});

console.log('\n=== Range Demonstration Complete ===');