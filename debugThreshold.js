/**
 * Debug the threshold calculation
 */

console.log('=== Threshold Investigation ===\n');

// Helper function for threshold (same as in scanRoughness)
function getThreshold(f) {
    const sharpness = 0.24 / (0.021 * f + 19);
    return sharpness * 0.5;
}

console.log('Threshold calculations for various frequencies:');
const testFreqs = [200, 300, 400, 600, 800, 1000, 1500, 2000];
testFreqs.forEach(f => {
    const threshold = getThreshold(f);
    console.log(`${f} Hz: threshold = ${threshold.toFixed(4)} Hz (${(threshold/f*100).toFixed(2)}% of fundamental)`);
});

console.log('\nTesting some frequency pairs:');
const pairs = [
    [200, 202],
    [300, 298],
    [600, 602],
    [600, 596],
    [1000, 1005],
    [440, 441]
];

pairs.forEach(([f1, f2]) => {
    const dist = Math.abs(f1 - f2);
    const threshold = getThreshold(Math.min(f1, f2));
    const withinThreshold = dist <= threshold;
    console.log(`${f1} Hz vs ${f2} Hz: distance = ${dist.toFixed(1)} Hz, threshold = ${threshold.toFixed(4)} Hz, within = ${withinThreshold}`);
});

// Test the roughness function formula manually
console.log('\nManual roughness calculation for 440 Hz vs 441 Hz:');
const f1 = 440, f2 = 441;
const f_low = Math.min(f1, f2);
const f_high = Math.max(f1, f2);
const distance = f_high - f_low;
const sharpness = 0.24 / (0.021 * f_low + 19);
const x = distance / sharpness;

console.log(`f_low: ${f_low}, f_high: ${f_high}`);
console.log(`distance: ${distance}`);
console.log(`sharpness: ${sharpness.toFixed(6)}`);
console.log(`x: ${x.toFixed(6)}`);
console.log(`Math.exp(-3.5 * x): ${Math.exp(-3.5 * x)}`);
console.log(`Math.sin(Math.PI * x): ${Math.sin(Math.PI * x)}`);
console.log(`Math.pow(Math.sin(Math.PI * x), 2): ${Math.pow(Math.sin(Math.PI * x), 2)}`);

const rough = Math.exp(-3.5 * x) * Math.pow(Math.sin(Math.PI * x), 2);
console.log(`Final roughness: ${rough}`);
