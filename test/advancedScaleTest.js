const { findScale } = require('../dissonance.js');
const { generateOvertonesArrays } = require('../overtoneGen.js');

// --- Configuration ---
const fundamental = 261.63; // C4
const numPartials = 8;

console.log('\n=== Advanced Scale Generation Test ===');
console.log(`Fundamental: ${fundamental} Hz (C4)`);

// Generate different types of overtone series for testing
const testCases = [
    {
        name: "Perfect Harmonic Series",
        params: { harmonicPurity: 1.0, spectralBalance: 0.5, oddEvenBias: 0.5, formantStrength: 0.0, spectralRichness: 0.0, irregularity: 0.0 }
    },
    {
        name: "Slightly Inharmonic Series", 
        params: { harmonicPurity: 0.8, spectralBalance: 0.5, oddEvenBias: 0.5, formantStrength: 0.0, spectralRichness: 0.3, irregularity: 0.1 }
    },
    {
        name: "Odd-Biased Series",
        params: { harmonicPurity: 1.0, spectralBalance: 0.5, oddEvenBias: 0.8, formantStrength: 0.0, spectralRichness: 0.2, irregularity: 0.0 }
    }
];

testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1}: ${testCase.name} ---`);
    
    // Generate overtone series
    const overtoneArrays = generateOvertonesArrays(
        testCase.params.harmonicPurity,
        testCase.params.spectralBalance,
        testCase.params.oddEvenBias,
        testCase.params.formantStrength,
        testCase.params.spectralRichness,
        testCase.params.irregularity,
        numPartials
    );
    
    // Convert to frequencies and amplitudes
    const refFreq = overtoneArrays.ratios.map(r => r * fundamental);
    const refAmp = overtoneArrays.amplitudes;
    const freq = [...refFreq];
    const amp = [...refAmp];
    
    // Different scale constraints for testing
    const scaleConfigs = [
        { minNotes: 5, minRatio: 1.06, maxNotes: 8, name: "Pentatonic-style" },
        { minNotes: 7, minRatio: 1.05, maxNotes: 10, name: "Heptatonic-style" },
        { minNotes: 12, minRatio: 1.03, maxNotes: 16, name: "Chromatic-style" }
    ];
    
    scaleConfigs.forEach(config => {
        console.log(`\n  ${config.name} Scale (${config.minNotes}-${config.maxNotes} notes, min ratio: ${config.minRatio}):`);
        
        try {
            const scale = findScale(freq, amp, config.minNotes, config.minRatio, config.maxNotes, refFreq, refAmp);
            
            console.log('  Note | Freq(Hz) | Ratio  | Cents  | Note Name (approx)');
            console.log('  -----|----------|--------|--------|------------------');
            
            scale.forEach((note, noteIndex) => {
                const cents = Math.log2(note.ratio) * 1200;
                const noteNum = String(noteIndex + 1).padEnd(4);
                const freq = note.frequency.toFixed(1).padEnd(8);
                const ratio = note.ratio.toFixed(3).padEnd(6);
                const centsStr = cents.toFixed(0).padEnd(6);
                
                // Approximate note name based on cents
                let noteName = "";
                const centsFromUnison = cents;
                if (Math.abs(centsFromUnison) < 50) noteName = "C";
                else if (Math.abs(centsFromUnison - 100) < 50) noteName = "C#/Db";
                else if (Math.abs(centsFromUnison - 200) < 50) noteName = "D";
                else if (Math.abs(centsFromUnison - 300) < 50) noteName = "D#/Eb";
                else if (Math.abs(centsFromUnison - 400) < 50) noteName = "E";
                else if (Math.abs(centsFromUnison - 500) < 50) noteName = "F";
                else if (Math.abs(centsFromUnison - 600) < 50) noteName = "F#/Gb";
                else if (Math.abs(centsFromUnison - 700) < 50) noteName = "G";
                else if (Math.abs(centsFromUnison - 800) < 50) noteName = "G#/Ab";
                else if (Math.abs(centsFromUnison - 900) < 50) noteName = "A";
                else if (Math.abs(centsFromUnison - 1000) < 50) noteName = "A#/Bb";
                else if (Math.abs(centsFromUnison - 1100) < 50) noteName = "B";
                else if (Math.abs(centsFromUnison - 1200) < 50) noteName = "C (oct)";
                else noteName = "?";
                
                console.log(`  ${noteNum} | ${freq} | ${ratio} | ${centsStr} | ${noteName}`);
            });
            
            console.log(`  Total notes: ${scale.length}`);
            
            // Show largest and smallest intervals
            if (scale.length > 1) {
                const intervals = [];
                for (let i = 1; i < scale.length; i++) {
                    const intervalRatio = scale[i].frequency / scale[i-1].frequency;
                    const intervalCents = Math.log2(intervalRatio) * 1200;
                    intervals.push({ ratio: intervalRatio, cents: intervalCents });
                }
                
                const minInterval = intervals.reduce((min, curr) => curr.cents < min.cents ? curr : min);
                const maxInterval = intervals.reduce((max, curr) => curr.cents > max.cents ? curr : max);
                
                console.log(`  Smallest interval: ${minInterval.cents.toFixed(1)} cents (ratio: ${minInterval.ratio.toFixed(3)})`);
                console.log(`  Largest interval: ${maxInterval.cents.toFixed(1)} cents (ratio: ${maxInterval.ratio.toFixed(3)})`);
            }
            
        } catch (error) {
            console.log(`  Error generating scale: ${error.message}`);
        }
    });
    
    // Show the overtone series for reference
    console.log('\n  Reference Overtone Series:');
    console.log('  Partial | Ratio  | Freq(Hz)');
    console.log('  --------|--------|----------');
    refFreq.forEach((f, i) => {
        const partialNum = String(i + 1).padEnd(7);
        const ratio = overtoneArrays.ratios[i].toFixed(3).padEnd(6);
        const freq = f.toFixed(1);
        console.log(`  ${partialNum} | ${ratio} | ${freq}`);
    });
});

console.log('\n=== Scale Generation Test Complete ===');