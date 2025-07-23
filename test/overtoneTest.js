const {
    generateDissonanceCurve,
    findLocalMinima,
    refineMinimaAndGetCurves
} = require('../dissonance.js');
const { generateOvertonesArrays } = require('../overtoneGen.js');
const fs = require('fs');

// --- Configuration ---
const numPartials = 9;
const fundamental = 500;
const rangeStart = 1.0;
const rangeEnd = 2.3;
const coarseIncrement = 0.005; // A finer increment to distinguish close minima
const fineSearchWidth = 0.01; 
const fineIncrement = 0.0005;

// Generate swept overtone series (harmonic series) with natural rolloff
const freq = Array.from({length: numPartials}, (_, i) => fundamental * (i + 1));
const rolloff = 0.5; // matches overtoneGen default for natural rolloff
const amp = freq.map((f, i) => Math.pow(1 / (i + 1), rolloff));

// Generate reference overtone series using overtoneGen (should match harmonic series with rolloff)
const overtoneParams = {
    harmonicPurity: 0.0,      // perfect harmonic series
    spectralBalance: 0.5,     // balanced (natural rolloff)
    oddEvenBias: 0.5,         // no bias
    formantStrength: 0.0,     // no formants
    spectralRichness: 0.0,    // minimal richness
    irregularity: 1.0,        // no irregularity
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
const refFreq = overtoneArrays.ratios.map(r => r * fundamental);
const refAmp = overtoneArrays.amplitudes;

// --- Expected Minima (from guide.txt for a 9-partial harmonic timbre) ---
const expectedMinimaData = {
    "Unison": 1.0,
    "Just Whole Tone": 1.125,       // 9:8
    "Septimal Major Second": 1.14,  // 8:7
    "Septimal Minor Third": 1.17,   // 7:6
    "Minor Third": 1.2,             // 6:5
    "Major Third": 1.25,            // 5:4
    "Perfect Fourth": 1.33,         // 4:3
    "Septimal Tritone": 1.4,        // 7:5
    "Perfect Fifth": 1.5,           // 3:2
    "Minor Sixth": 1.6,             // 8:5
    "Major Sixth": 1.67,            // 5:3
    "Septimal Minor Seventh": 1.75, // 7:4
    "Large Major Seventh": 1.8,     // 9:5
    "Octave": 2.0
};

// 1. Generate the coarse dissonance curve using overtoneGen for reference
const { alphas, dissonances } = generateDissonanceCurve(freq, amp, rangeStart, rangeEnd, coarseIncrement, refFreq, refAmp);

// 2. Find the local minima in the coarse curve
const coarseMinima = findLocalMinima(alphas, dissonances);

// 3. Refine the minima and get the high-resolution curve segments using overtoneGen for reference
const refinedResults = refineMinimaAndGetCurves(freq, amp, coarseMinima, fineSearchWidth, fineIncrement, refFreq, refAmp);
const refinedMinima = refinedResults.map(r => r.minimum);

// 4. Construct the final, high-resolution curve data
const finalCurveData = [];
let coarseIndex = 0;
while (coarseIndex < alphas.length) {
    const currentAlpha = alphas[coarseIndex];
    const refinedRegion = refinedResults.find(r => 
        currentAlpha >= r.curve[0].alpha && currentAlpha < r.curve[r.curve.length - 1].alpha
    );

    if (refinedRegion) {
        refinedRegion.curve.forEach(point => finalCurveData.push({ x: point.alpha, y: point.dissonance }));
        coarseIndex = alphas.findIndex(a => a > refinedRegion.curve[refinedRegion.curve.length - 1].alpha);
        if (coarseIndex === -1) break; // End of the line
    } else {
        finalCurveData.push({ x: currentAlpha, y: dissonances[coarseIndex] });
        coarseIndex++;
    }
}
finalCurveData.sort((a, b) => a.x - b.x);

const minimaPoints = refinedMinima.map(m => ({ x: m.alpha, y: m.dissonance }));

// 5. Generate the HTML chart with both overtone series plotted
const sweptOvertonesData = freq.map((f, i) => ({ x: f, y: amp[i] }));
const refOvertonesData = refFreq.map((f, i) => ({ x: f, y: refAmp[i] }));

const chartHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Dissonance Curve with Minima & Overtone Series</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h2>Dissonance Curve with Minima</h2>
    <canvas id="dissonanceChart"></canvas>
    <h2>Overtone Series (Swept & Reference)</h2>
    <canvas id="overtoneChart"></canvas>
    <script>
        // Dissonance curve chart
        const ctx1 = document.getElementById('dissonanceChart').getContext('2d');
        new Chart(ctx1, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Dissonance',
                    data: ${JSON.stringify(finalCurveData)},
                    borderColor: 'rgba(0, 0, 255, 0.5)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                }, {
                    label: 'Refined Minima',
                    data: ${JSON.stringify(minimaPoints)},
                    type: 'scatter',
                    backgroundColor: 'red',
                    pointRadius: 5
                }]
            },
            options: {
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Interval (alpha)' } },
                    y: { title: { display: true, text: 'Dissonance' } }
                }
            }
        });

        // Overtone series chart
        const ctx2 = document.getElementById('overtoneChart').getContext('2d');
        new Chart(ctx2, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Swept Overtone Series',
                        data: ${JSON.stringify(sweptOvertonesData)},
                        backgroundColor: 'rgba(0, 200, 0, 0.7)',
                        borderColor: 'rgba(0, 200, 0, 1)',
                        pointRadius: 6
                    },
                    {
                        label: 'Reference Overtone Series',
                        data: ${JSON.stringify(refOvertonesData)},
                        backgroundColor: 'rgba(200, 0, 200, 0.7)',
                        borderColor: 'rgba(200, 0, 200, 1)',
                        pointRadius: 6
                    }
                ]
            },
            options: {
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Frequency (Hz)' } },
                    y: { title: { display: true, text: 'Amplitude' } }
                }
            }
        });
    </script>
</body>
</html>
`;


fs.writeFileSync('dissonance_chart_with_minima.html', chartHtml);
console.log('Dissonance chart with minima generated in dissonance_chart_with_minima.html, including overtone series plot.');

// 5b. Print overtone series comparison chart to console
console.log('\n--- Overtone Series Comparison ---');
console.log('Idx | Swept Freq | Swept Amp | Ref Freq   | Ref Amp');
console.log('-----------------------------------------------------');
for (let i = 0; i < Math.max(freq.length, refFreq.length); i++) {
    const sweptF = freq[i] !== undefined ? freq[i].toFixed(2).padEnd(10) : ''.padEnd(10);
    const sweptA = amp[i] !== undefined ? amp[i].toFixed(3).padEnd(9) : ''.padEnd(9);
    const refF = refFreq[i] !== undefined ? refFreq[i].toFixed(2).padEnd(10) : ''.padEnd(10);
    const refA = refAmp[i] !== undefined ? refAmp[i].toFixed(3).padEnd(9) : ''.padEnd(9);
    console.log(`${String(i+1).padEnd(3)}| ${sweptF} | ${sweptA} | ${refF} | ${refA}`);
}

// 6. Compare found minima with expected minima
console.log('\n--- Comparison of Found Minima to Expected Minima ---');
console.log('Found Interval | Expected Interval | Name                    | Difference');
console.log('--------------------------------------------------------------------------');

const matchedExpected = new Set();
refinedMinima.forEach(foundMin => {
    let closestMatch = { name: 'N/A', value: -1, diff: Infinity };
    for (const [name, value] of Object.entries(expectedMinimaData)) {
        if (matchedExpected.has(name)) continue; // Don't match an already used expected value
        const diff = Math.abs(foundMin.alpha - value);
        if (diff < closestMatch.diff) {
            closestMatch = { name, value, diff };
        }
    }

    if (closestMatch.diff < 0.03) { // Use a reasonable threshold
        const foundStr = foundMin.alpha.toFixed(4).padEnd(14);
        const expectedStr = closestMatch.value.toFixed(4).padEnd(17);
        const nameStr = closestMatch.name.padEnd(23);
        const diffStr = closestMatch.diff.toFixed(4);
        console.log(`${foundStr} | ${expectedStr} | ${nameStr} | ${diffStr}`);
        matchedExpected.add(closestMatch.name);
    }
});
