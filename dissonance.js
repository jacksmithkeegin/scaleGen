
function dissmeasure(fvec, amp) {
    const Dstar = 0.24;
    const S1 = 0.0207;
    const S2 = 18.96;
    const C1 = 5;
    const C2 = -5;
    const A1 = -3.51;
    const A2 = -5.75;

    const partials = fvec.map((f, i) => ({ f, a: amp[i] }))
                         .sort((p1, p2) => p1.f - p2.f);

    const N = partials.length;
    let D = 0;

    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const f1 = partials[i].f;
            const amp1 = partials[i].a;
            const f2 = partials[j].f;
            const amp2 = partials[j].a;

            const Fmin = f1;
            const Fdif = f2 - f1;
            const a = Math.min(amp1, amp2);

            const S = Dstar / (S1 * Fmin + S2);
            const Dnew = a * (C1 * Math.exp(A1 * S * Fdif) + C2 * Math.exp(A2 * S * Fdif));
            D += Dnew;
        }
    }
    return D;
}

function generateDissonanceCurve(freq, amp, start, end, inc) {
    const dissonances = [];
    const alphas = [];
    for (let alpha = start; alpha <= end; alpha += inc) {
        const f = [...freq, ...freq.map(val => val * alpha)];
        const a = [...amp, ...amp];
        const d = dissmeasure(f, a);
        dissonances.push(d);
        alphas.push(alpha);
    }
    return { alphas, dissonances };
}

function findLocalMinima(alphas, dissonances) {
    const minima = [];
    // Check start
    if (dissonances[0] < dissonances[1]) {
        minima.push({ alpha: alphas[0], dissonance: dissonances[0] });
    }
    // Check interior
    for (let i = 1; i < dissonances.length - 1; i++) {
        if (dissonances[i] < dissonances[i - 1] && dissonances[i] < dissonances[i + 1]) {
            minima.push({ alpha: alphas[i], dissonance: dissonances[i] });
        }
    }
    // Check end
    if (dissonances[dissonances.length - 1] < dissonances[dissonances.length - 2]) {
        minima.push({ alpha: alphas[alphas.length - 1], dissonance: dissonances[dissonances.length - 1] });
    }
    return minima;
}

function refineMinimaAndGetCurves(freq, amp, coarseMinima, searchWidth, increment) {
    const refinedResults = [];
    for (const coarseMin of coarseMinima) {
        const start = coarseMin.alpha - searchWidth;
        const end = coarseMin.alpha + searchWidth;
        const { alphas, dissonances } = generateDissonanceCurve(freq, amp, start, end, increment);
        
        let minDissonance = Infinity;
        let minAlpha = -1;
        const curve = [];

        for (let i = 0; i < dissonances.length; i++) {
            const currentAlpha = alphas[i];
            const currentDissonance = dissonances[i];
            curve.push({ alpha: currentAlpha, dissonance: currentDissonance });
            if (currentDissonance < minDissonance) {
                minDissonance = currentDissonance;
                minAlpha = currentAlpha;
            }
        }
        
        if (minAlpha !== -1) {
            refinedResults.push({ 
                minimum: { alpha: minAlpha, dissonance: minDissonance },
                curve: curve 
            });
        }
    }
    return refinedResults;
}

module.exports = { 
    dissmeasure,
    generateDissonanceCurve,
    findLocalMinima,
    refineMinimaAndGetCurves
};
