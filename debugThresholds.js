/**
 * Test different threshold formulas
 */

console.log('=== Testing Different Critical Bandwidth Formulas ===\n');

// Current formula
function currentThreshold(f) {
    const sharpness = 0.24 / (0.021 * f + 19);
    return sharpness * 0.5;
}

// Bark scale based formula (more standard)
function barkThreshold(f) {
    // Critical bandwidth in Hz based on Bark scale
    const cb = 25 + 75 * Math.pow(1 + 1.4 * (f/1000), 0.69);
    return cb * 0.1; // Factor for roughness threshold
}

// Simple percentage-based threshold
function percentageThreshold(f) {
    return f * 0.01; // 1% of the frequency
}

// Just noticeable difference (JND) based
function jndThreshold(f) {
    // Weber fraction for frequency discrimination is roughly 0.002-0.005
    return f * 0.003;
}

console.log('Threshold comparison for various frequencies:');
console.log('Freq(Hz)  | Current   | Bark      | 1%        | JND(0.3%) ');
console.log('----------|-----------|-----------|-----------|----------');

const testFreqs = [200, 440, 1000, 2000];
testFreqs.forEach(f => {
    const current = currentThreshold(f);
    const bark = barkThreshold(f);
    const percent = percentageThreshold(f);
    const jnd = jndThreshold(f);
    
    console.log(`${f.toString().padStart(4)}      | ${current.toFixed(5)} | ${bark.toFixed(2).padStart(5)} | ${percent.toFixed(2).padStart(5)} | ${jnd.toFixed(2).padStart(5)}`);
});

// Test roughness with more reasonable thresholds
console.log('\n=== Testing roughness with different thresholds ===');

function testRoughness(f1, f2, thresholdFunc, name) {
    const distance = Math.abs(f1 - f2);
    const threshold = thresholdFunc(Math.min(f1, f2));
    const withinThreshold = distance <= threshold;
    
    if (withinThreshold) {
        // Original roughness calculation
        const f_low = Math.min(f1, f2);
        const f_high = Math.max(f1, f2);
        const dist = f_high - f_low;
        const sharpness = 0.24 / (0.021 * f_low + 19);
        const x = dist / sharpness;
        const rough = Math.exp(-3.5 * x) * Math.pow(Math.sin(Math.PI * x), 2);
        
        console.log(`${name}: ${f1} vs ${f2} Hz - threshold: ${threshold.toFixed(3)}, roughness: ${rough.toExponential(3)}`);
    } else {
        console.log(`${name}: ${f1} vs ${f2} Hz - threshold: ${threshold.toFixed(3)}, outside threshold`);
    }
}

const testPairs = [[440, 441], [440, 445], [200, 202], [1000, 1010]];

testPairs.forEach(([f1, f2]) => {
    console.log(`\nTesting ${f1} Hz vs ${f2} Hz:`);
    testRoughness(f1, f2, currentThreshold, 'Current ');
    testRoughness(f1, f2, barkThreshold, 'Bark    ');
    testRoughness(f1, f2, percentageThreshold, '1%      ');
    testRoughness(f1, f2, jndThreshold, 'JND     ');
});
