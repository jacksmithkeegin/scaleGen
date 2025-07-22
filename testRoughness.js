/**
 * Debug version to test roughness with slightly detuned frequencies
 */

const { InstCollection } = require('./instCollection');
const { calculateCollectionRoughness, calculateNoteRoughnessAverages, thinScales } = require('./roughness');
const { debugCalculateCollectionRoughness } = require('./debugRoughness');

console.log('=== Testing Roughness with Slightly Detuned Frequencies ===\n');

// Test the roughness function directly with some close frequencies
const { roughness } = require('./roughness');

console.log('Direct roughness tests:');
console.log(`roughness(440, 440): ${roughness(440, 440)}`); // Should be 0
console.log(`roughness(440, 441): ${roughness(440, 441)}`); // Should be > 0
console.log(`roughness(440, 445): ${roughness(440, 445)}`); // Should be > 0
console.log(`roughness(440, 450): ${roughness(440, 450)}`); // Should be less than 445
console.log(`roughness(440, 880): ${roughness(440, 880)}`); // Should be very small (octave)

// Let's test with some manually created scales that should have roughness
const testData = [
    {
        absoluteSeries: [
            { frequency: 200, amplitude: 1.0 },
            { frequency: 400, amplitude: 0.5 },
            { frequency: 600, amplitude: 0.3 }
        ],
        scaleNotes: [200, 202] // Slightly detuned
    },
    {
        absoluteSeries: [
            { frequency: 300, amplitude: 1.0 },
            { frequency: 600, amplitude: 0.5 },
            { frequency: 900, amplitude: 0.3 }
        ],
        scaleNotes: [298, 301] // Also slightly detuned
    }
];

console.log('\n=== Manual Test Data ===');
testData.forEach((inst, i) => {
    console.log(`Instrument ${i}: notes [${inst.scaleNotes.join(', ')}] Hz`);
    console.log(`  Overtones: [${inst.absoluteSeries.map(ot => ot.frequency).join(', ')}] Hz`);
});

const manualRoughness = debugCalculateCollectionRoughness(testData);
console.log(`\nManual test roughness: ${manualRoughness.toFixed(6)}`);
