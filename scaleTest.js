const { findScale } = require('./dissonance.js');
const { generateOvertonesArrays } = require('./overtoneGen.js');

// --- Configuration ---
const fundamental = 440; // A4
const numPartials = 9;

// Generate reference overtone series (harmonic series) with natural rolloff
const overtoneParams = {
    harmonicPurity: 1.0,      // perfect harmonic series
    spectralBalance: 0.5,     // balanced (natural rolloff)
    oddEvenBias: 0.5,         // no bias
    formantStrength: 0.0,     // no formants
    spectralRichness: 0.0,    // minimal richness
    irregularity: 0.0,        // no irregularity
    maxHarmonics: numPartials
};

const overtoneArrays = generateOvertonesArrays(
    overtoneParams.harmonicPurity,
    overtoneParams.spectralBalance,
    overtoneParams.oddEvenBias,
    overtoneParams.formantStrength,
    overtoneParams.spectralRichness,
    overtoneParams.irregularity,
    overtoneParams.maxHarmonics
);

// Convert to frequencies and amplitudes
const refFreq = overtoneArrays.ratios.map(r => r * fundamental);
const refAmp = overtoneArrays.amplitudes;

// Use the same overtone series for both reference and swept
const freq = [...refFreq];
const amp = [...refAmp];

// Scale finding parameters
const minNotes = 5;      // Minimum notes in scale
const minRatio = 1.05;   // Minimum ratio between successive notes (about 86 cents)
const maxNotes = 12;     // Maximum notes in scale

console.log('\n--- Scale Finding Test ---');
console.log(`Fundamental: ${fundamental} Hz`);
console.log(`Reference overtone series: ${numPartials} partials`);
console.log(`Scale constraints: ${minNotes}-${maxNotes} notes, min ratio: ${minRatio.toFixed(3)}`);
console.log('');

// Find the scale
const scale = findScale(freq, amp, minNotes, minRatio, maxNotes, refFreq, refAmp);

console.log('--- Generated Scale ---');
console.log('Note | Frequency  | Ratio    | Cents    | Dissonance');
console.log('-----|------------|----------|----------|----------');

scale.forEach((note, index) => {
    const cents = Math.log2(note.ratio) * 1200;
    const noteNum = String(index + 1).padEnd(4);
    const freq = note.frequency.toFixed(2).padEnd(10);
    const ratio = note.ratio.toFixed(4).padEnd(8);
    const centsStr = cents.toFixed(1).padEnd(8);
    const diss = note.dissonance.toFixed(4);
    
    console.log(`${noteNum} | ${freq} | ${ratio} | ${centsStr} | ${diss}`);
});

console.log('');
console.log(`Total notes found: ${scale.length}`);

// Calculate intervals between successive notes
console.log('\n--- Intervals Between Successive Notes ---');
console.log('From Note | To Note | Ratio    | Cents    ');
console.log('----------|---------|----------|----------');

for (let i = 1; i < scale.length; i++) {
    const intervalRatio = scale[i].frequency / scale[i-1].frequency;
    const intervalCents = Math.log2(intervalRatio) * 1200;
    const fromNote = String(i).padEnd(9);
    const toNote = String(i + 1).padEnd(7);
    const ratioStr = intervalRatio.toFixed(4).padEnd(8);
    const centsStr = intervalCents.toFixed(1);
    
    console.log(`${fromNote} | ${toNote} | ${ratioStr} | ${centsStr}`);
}

// Show reference overtone series for context
console.log('\n--- Reference Overtone Series ---');
console.log('Partial | Frequency  | Amplitude | Ratio');
console.log('--------|------------|-----------|-------');

refFreq.forEach((f, index) => {
    const partialNum = String(index + 1).padEnd(7);
    const freq = f.toFixed(2).padEnd(10);
    const amp = refAmp[index].toFixed(3).padEnd(9);
    const ratio = overtoneArrays.ratios[index].toFixed(4);
    
    console.log(`${partialNum} | ${freq} | ${amp} | ${ratio}`);
});
