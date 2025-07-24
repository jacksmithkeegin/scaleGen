const { buildScalesFromOvertones } = require('./buildScale.js');
const { generateOvertonesArrays } = require('./overtoneGen.js');

console.log('\n=== Build Scales from Multiple Overtone Series Test ===');

// Create multiple overtone series with different fundamentals
const fundamentals = [220, 330, 440, 550]; // A3, E4, A4, C#5
const numPartials = 8;

console.log('Generating overtone series for fundamentals:', fundamentals.map(f => `${f} Hz`).join(', '));

// Generate different types of overtone series
const overtoneSeries = fundamentals.map((fundamental, index) => {
    // Vary the overtone characteristics for each fundamental
    const harmonicPurity = 1.0 - (index * 0.1); // Slightly less harmonic as we go up
    const spectralRichness = index * 0.1; // More richness as we go up
    const irregularity = index * 0.05; // Slight irregularity increase
    
    const overtoneArrays = generateOvertonesArrays(
        harmonicPurity,    // harmonicPurity
        0.5,              // spectralBalance
        0.5,              // oddEvenBias
        0.0,              // formantStrength
        spectralRichness, // spectralRichness
        irregularity,     // irregularity
        numPartials       // maxHarmonics
    );
    
    const freq = overtoneArrays.ratios.map(r => r * fundamental);
    const amp = overtoneArrays.amplitudes;
    
    console.log(`\nOvertone Series ${index + 1} (${fundamental} Hz):`);
    console.log(`  Harmonic Purity: ${harmonicPurity.toFixed(2)}, Spectral Richness: ${spectralRichness.toFixed(2)}, Irregularity: ${irregularity.toFixed(2)}`);
    console.log('  Partial | Freq(Hz) | Amplitude | Ratio');
    console.log('  --------|----------|-----------|-------');
    freq.forEach((f, i) => {
        const partialNum = String(i + 1).padEnd(7);
        const freqStr = f.toFixed(1).padEnd(8);
        const ampStr = amp[i].toFixed(3).padEnd(9);
        const ratioStr = overtoneArrays.ratios[i].toFixed(3);
        console.log(`  ${partialNum} | ${freqStr} | ${ampStr} | ${ratioStr}`);
    });
    
    return { freq, amp };
});

// Scale generation parameters
const minNotes = 5;
const minRatio = 1.06; // About 100 cents minimum interval
const maxNotes = 15;    // Reduced from default 36 for cleaner display

console.log(`\n--- Generating Scales ---`);
console.log(`Scale parameters: ${minNotes}-${maxNotes} notes, min ratio: ${minRatio}`);
console.log('');

// Generate scales
const scales = buildScalesFromOvertones(overtoneSeries, minNotes, minRatio, maxNotes);

// Display results
console.log('\n=== Generated Scales ===');

scales.forEach((scale, seriesIndex) => {
    const fundamental = fundamentals[seriesIndex];
    console.log(`\n--- Scale ${seriesIndex + 1} (Fundamental: ${fundamental} Hz) ---`);
    
    if (scale.length === 0) {
        console.log('  No scale generated (error occurred)');
        return;
    }
    
    console.log('  Note | Frequency  | Ratio    | Cents    | Dissonance | Note Name');
    console.log('  -----|------------|----------|----------|------------|----------');
    
    scale.forEach((note, noteIndex) => {
        const cents = Math.log2(note.ratio) * 1200;
        const noteNum = String(noteIndex + 1).padEnd(4);
        const freq = note.frequency.toFixed(2).padEnd(10);
        const ratio = note.ratio.toFixed(4).padEnd(8);
        const centsStr = cents.toFixed(1).padEnd(8);
        const diss = note.dissonance.toFixed(4).padEnd(10);
        
        // Simple note name approximation based on cents from fundamental
        let noteName = "";
        const centsFromUnison = cents;
        if (Math.abs(centsFromUnison) < 50) noteName = "Unison";
        else if (Math.abs(centsFromUnison - 200) < 50) noteName = "Maj 2nd";
        else if (Math.abs(centsFromUnison - 300) < 50) noteName = "Min 3rd";
        else if (Math.abs(centsFromUnison - 400) < 50) noteName = "Maj 3rd";
        else if (Math.abs(centsFromUnison - 500) < 50) noteName = "P 4th";
        else if (Math.abs(centsFromUnison - 600) < 50) noteName = "Tritone";
        else if (Math.abs(centsFromUnison - 700) < 50) noteName = "P 5th";
        else if (Math.abs(centsFromUnison - 800) < 50) noteName = "Min 6th";
        else if (Math.abs(centsFromUnison - 900) < 50) noteName = "Maj 6th";
        else if (Math.abs(centsFromUnison - 1000) < 50) noteName = "Min 7th";
        else if (Math.abs(centsFromUnison - 1100) < 50) noteName = "Maj 7th";
        else if (Math.abs(centsFromUnison - 1200) < 50) noteName = "Octave";
        else if (Math.abs(centsFromUnison + 1200) < 50) noteName = "Sub-oct";
        else noteName = "Other";
        
        console.log(`  ${noteNum} | ${freq} | ${ratio} | ${centsStr} | ${diss} | ${noteName}`);
    });
    
    // Show scale statistics
    if (scale.length > 1) {
        const intervals = [];
        for (let i = 1; i < scale.length; i++) {
            const intervalRatio = scale[i].frequency / scale[i-1].frequency;
            const intervalCents = Math.log2(intervalRatio) * 1200;
            intervals.push({ ratio: intervalRatio, cents: intervalCents });
        }
        
        const minInterval = intervals.reduce((min, curr) => curr.cents < min.cents ? curr : min);
        const maxInterval = intervals.reduce((max, curr) => curr.cents > max.cents ? curr : max);
        const avgInterval = intervals.reduce((sum, curr) => sum + curr.cents, 0) / intervals.length;
        
        console.log(`  \n  Scale Statistics:`);
        console.log(`    Total notes: ${scale.length}`);
        console.log(`    Smallest interval: ${minInterval.cents.toFixed(1)} cents (ratio: ${minInterval.ratio.toFixed(3)})`);
        console.log(`    Largest interval: ${maxInterval.cents.toFixed(1)} cents (ratio: ${maxInterval.ratio.toFixed(3)})`);
        console.log(`    Average interval: ${avgInterval.toFixed(1)} cents`);
        
        // Calculate the total span of the scale
        const totalSpan = scale[scale.length - 1].frequency / scale[0].frequency;
        const totalSpanCents = Math.log2(totalSpan) * 1200;
        console.log(`    Total span: ${totalSpanCents.toFixed(1)} cents (ratio: ${totalSpan.toFixed(3)})`);
    }
});

console.log('\n=== Scale Building Complete ===');
