const {
    generateDissonanceCurve,
    findLocalMinima,
    refineMinimaAndGetCurves
} = require('./dissonance.js');
const fs = require('fs');

// --- Configuration ---
const freq = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500]; // 9 partials
const amp = [1, 1, 1, 1, 1, 1, 1, 1, 1];
const rangeStart = 1.0;
const rangeEnd = 2.3;
const coarseIncrement = 0.005; // A finer increment to distinguish close minima
const fineSearchWidth = 0.01; 
const fineIncrement = 0.0005;

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

// 1. Generate the coarse dissonance curve
const { alphas, dissonances } = generateDissonanceCurve(freq, amp, rangeStart, rangeEnd, coarseIncrement);

// 2. Find the local minima in the coarse curve
const coarseMinima = findLocalMinima(alphas, dissonances);

// 3. Refine the minima and get the high-resolution curve segments
const refinedResults = refineMinimaAndGetCurves(freq, amp, coarseMinima, fineSearchWidth, fineIncrement);
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

// 5. Generate the HTML chart
const chartHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Dissonance Curve with Minima</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <canvas id="dissonanceChart"></canvas>
    <script>
        const ctx = document.getElementById('dissonanceChart').getContext('2d');
        new Chart(ctx, {
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
    </script>
</body>
</html>
`;

fs.writeFileSync('dissonance_chart_with_minima.html', chartHtml);
console.log('Dissonance chart with minima generated in dissonance_chart_with_minima.html');

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
