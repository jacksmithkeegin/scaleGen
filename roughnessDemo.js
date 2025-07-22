/**
 * Test with closer fundamentals to demonstrate roughness calculations
 */

const { InstCollection } = require('./instCollection');
const { calculateCollectionRoughness, calculateNoteRoughnessAverages, thinScales } = require('./roughness');

console.log('=== Testing with Close Fundamentals for Roughness Demo ===\n');

// Closer fundamentals to create more roughness
const lowParams = {
    fundamental: 200, // Close to mid
    harmonicPurity: 1.0,
    spectralBalance: 0.4,
    oddEvenBias: 0.5,
    formantStrength: 0.0,
    spectralRichness: 0.7,
    irregularity: 0.0,
    maxHarmonics: 8
};

const midParams = {
    fundamental: 250, // Close to both
    harmonicPurity: 1.0,
    spectralBalance: 0.4,
    oddEvenBias: 0.5,
    formantStrength: 0.0,
    spectralRichness: 0.7,
    irregularity: 0.0,
    maxHarmonics: 8
};

const highParams = {
    fundamental: 300, // Close to mid
    harmonicPurity: 1.0,
    spectralBalance: 0.4,
    oddEvenBias: 0.5,
    formantStrength: 0.0,
    spectralRichness: 0.7,
    irregularity: 0.0,
    maxHarmonics: 8
};

try {
    const collection = new InstCollection(lowParams, midParams, highParams);
    
    console.log(`Optimized fundamentals:`);
    console.log(`Low: ${collection.low.fundamental.toFixed(2)} Hz`);
    console.log(`Mid: ${collection.mid.fundamental.toFixed(2)} Hz`);
    console.log(`High: ${collection.high.fundamental.toFixed(2)} Hz`);
    
    // Generate smaller scales for this test
    const scaleOptions = {
        rangeOctaves: 0.8,
        granularityCents: 15,
        minRatio: Math.pow(2, 50/1200), // Smaller minimum ratio
        targetCount: 4,
        refineRangeCents: 10,
        refineGranularityCents: 2
    };
    
    collection.generateScales(scaleOptions);
    
    console.log('\n=== Generated Scales ===');
    console.log('Low notes:', collection.lowNotes.map(f => f.toFixed(2)));
    console.log('Mid notes:', collection.midNotes.map(f => f.toFixed(2)));
    console.log('High notes:', collection.highNotes.map(f => f.toFixed(2)));
    
    const instrumentData = [
        { absoluteSeries: collection.low.absoluteSeries, scaleNotes: collection.lowNotes },
        { absoluteSeries: collection.mid.absoluteSeries, scaleNotes: collection.midNotes },
        { absoluteSeries: collection.high.absoluteSeries, scaleNotes: collection.highNotes }
    ];
    
    const totalRoughness = calculateCollectionRoughness(instrumentData);
    console.log(`\nTotal collection roughness: ${totalRoughness.toFixed(6)}`);
    
    const noteRoughness = calculateNoteRoughnessAverages(instrumentData);
    const instNames = ['Low', 'Mid', 'High'];
    console.log('\n=== Top 5 Roughest Notes ===');
    noteRoughness.sort((a, b) => b.avgRoughness - a.avgRoughness)
        .slice(0, 5)
        .forEach(note => {
            const instName = instNames[note.instrumentIndex];
            console.log(`${instName} ${note.noteFreq.toFixed(2)} Hz: roughness ${note.avgRoughness.toFixed(6)}`);
        });
        
    console.log('\n=== Test Completed ===');
    
} catch (error) {
    console.error('Error:', error.message);
}
