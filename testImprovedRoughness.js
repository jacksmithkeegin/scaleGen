/**
 * Test a corrected roughness model
 */

console.log('=== Testing Corrected Roughness Model ===\n');

// Improved roughness model based on psychoacoustics
function improvedRoughness(f1, f2) {
    if (f1 === f2) return 0; // No roughness for identical frequencies
    
    const f_low = Math.min(f1, f2);
    const f_high = Math.max(f1, f2);
    const distance = f_high - f_low;
    
    // Critical bandwidth using Bark scale (more standard)
    const f_center = (f_low + f_high) / 2;
    const cb = 25 + 75 * Math.pow(1 + 1.4 * (f_center/1000), 0.69);
    
    // Normalize distance to critical bandwidth
    const x = distance / cb;
    
    // Roughness curve: peaks around x = 0.25 (quarter critical bandwidth)
    // Use a more reasonable exponential decay
    if (x > 2) return 0; // No roughness beyond 2 critical bandwidths
    
    const roughness = Math.exp(-x) * Math.pow(Math.sin(2 * Math.PI * x), 2);
    return Math.max(0, roughness);
}

// Test the improved model
console.log('Improved roughness model tests:');
const testPairs = [
    [440, 440], // Should be 0
    [440, 441], // Should be > 0 
    [440, 445], // Should be > 0
    [440, 450], // Should be > 0
    [440, 460], // Should be > 0 but less
    [440, 480], // Should be smaller
    [440, 500], // Should be very small
    [440, 880], // Octave - should be very small
];

testPairs.forEach(([f1, f2]) => {
    const original = originalRoughness(f1, f2);
    const improved = improvedRoughness(f1, f2);
    console.log(`${f1} vs ${f2} Hz: original = ${original.toExponential(3)}, improved = ${improved.toFixed(6)}`);
});

function originalRoughness(f1, f2) {
    if (f1 === f2) return 0;
    const f_low = Math.min(f1, f2);
    const f_high = Math.max(f1, f2);
    const distance = f_high - f_low;
    const sharpness = 0.24 / (0.021 * f_low + 19);
    const x = distance / sharpness;
    const rough = Math.exp(-3.5 * x) * Math.pow(Math.sin(Math.PI * x), 2);
    return Math.max(0, Math.min(1, rough));
}

// Test what a reasonable threshold should be for the improved model
console.log('\n=== Threshold for improved model ===');
function improvedThreshold(f) {
    // Use a percentage of critical bandwidth - more practical
    const cb = 25 + 75 * Math.pow(1 + 1.4 * (f/1000), 0.69);
    return cb; // Full critical bandwidth as threshold
}

console.log('Improved threshold values:');
[200, 440, 1000, 2000].forEach(f => {
    const threshold = improvedThreshold(f);
    console.log(`${f} Hz: threshold = ${threshold.toFixed(2)} Hz (${(threshold/f*100).toFixed(2)}% of fundamental)`);
});

// Test the combination
console.log('\n=== Combined improved model test ===');
const testData = [
    {
        absoluteSeries: [
            { frequency: 200, amplitude: 1.0 },
            { frequency: 400, amplitude: 0.5 },
            { frequency: 600, amplitude: 0.3 }
        ],
        scaleNotes: [200, 210] // 10 Hz difference
    },
    {
        absoluteSeries: [
            { frequency: 440, amplitude: 1.0 },
            { frequency: 880, amplitude: 0.5 },
            { frequency: 1320, amplitude: 0.3 }
        ],
        scaleNotes: [450, 460] // 10 Hz differences
    }
];

function calculateImprovedRoughness(instrumentCollection) {
    let totalRoughness = 0;
    
    // For each pair of instruments
    for (let i = 0; i < instrumentCollection.length; i++) {
        for (let j = i + 1; j < instrumentCollection.length; j++) {
            const inst1 = instrumentCollection[i];
            const inst2 = instrumentCollection[j];
            
            // For each note pair between these instruments
            for (const note1 of inst1.scaleNotes) {
                for (const note2 of inst2.scaleNotes) {
                    // Shift overtone series to these note frequencies
                    const fund1 = Math.min(...inst1.absoluteSeries.map(ot => ot.frequency));
                    const fund2 = Math.min(...inst2.absoluteSeries.map(ot => ot.frequency));
                    
                    const shifted1 = inst1.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (note1 / fund1),
                        amplitude: ot.amplitude
                    }));
                    const shifted2 = inst2.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (note2 / fund2),
                        amplitude: ot.amplitude
                    }));
                    
                    // Calculate roughness between all overtone pairs within threshold
                    for (const ot1 of shifted1) {
                        for (const ot2 of shifted2) {
                            const dist = Math.abs(ot1.frequency - ot2.frequency);
                            const threshold = improvedThreshold(Math.min(ot1.frequency, ot2.frequency));
                            if (dist <= threshold) {
                                const r = improvedRoughness(ot1.frequency, ot2.frequency);
                                totalRoughness += r * ot1.amplitude * ot2.amplitude;
                            }
                        }
                    }
                }
            }
        }
    }
    return totalRoughness;
}

const improvedTotal = calculateImprovedRoughness(testData);
console.log(`Improved model total roughness: ${improvedTotal.toFixed(6)}`);
