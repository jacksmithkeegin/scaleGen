/**
 * Debug version of roughness calculations
 */

const { roughness } = require('./roughness');

function debugCalculateCollectionRoughness(instrumentCollection) {
    let totalRoughness = 0;
    let pairCount = 0;
    let withinThresholdCount = 0;
    
    console.log('\n=== Debug: Collection Roughness Calculation ===');
    
    // Helper function for threshold (same as in scanRoughness)
    function getThreshold(f) {
        const sharpness = 0.24 / (0.021 * f + 19);
        return sharpness * 0.5;
    }
    
    // For each pair of instruments
    for (let i = 0; i < instrumentCollection.length; i++) {
        for (let j = i + 1; j < instrumentCollection.length; j++) {
            const inst1 = instrumentCollection[i];
            const inst2 = instrumentCollection[j];
            
            console.log(`\nComparing instrument ${i} with instrument ${j}`);
            console.log(`Instrument ${i}: ${inst1.scaleNotes.length} notes, ${inst1.absoluteSeries.length} overtones`);
            console.log(`Instrument ${j}: ${inst2.scaleNotes.length} notes, ${inst2.absoluteSeries.length} overtones`);
            
            // For each note pair between these instruments
            for (const note1 of inst1.scaleNotes) {
                for (const note2 of inst2.scaleNotes) {
                    console.log(`  Note pair: ${note1.toFixed(2)} Hz vs ${note2.toFixed(2)} Hz`);
                    
                    // Shift overtone series to these note frequencies
                    const fund1 = Math.min(...inst1.absoluteSeries.map(ot => ot.frequency));
                    const fund2 = Math.min(...inst2.absoluteSeries.map(ot => ot.frequency));
                    
                    console.log(`    Original fundamentals: ${fund1.toFixed(2)} Hz vs ${fund2.toFixed(2)} Hz`);
                    
                    const shifted1 = inst1.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (note1 / fund1),
                        amplitude: ot.amplitude
                    }));
                    const shifted2 = inst2.absoluteSeries.map(ot => ({
                        frequency: ot.frequency * (note2 / fund2),
                        amplitude: ot.amplitude
                    }));
                    
                    console.log(`    First few shifted1 overtones:`);
                    shifted1.slice(0, 3).forEach(ot => {
                        console.log(`      ${ot.frequency.toFixed(2)} Hz, amp: ${ot.amplitude.toFixed(4)}`);
                    });
                    
                    console.log(`    First few shifted2 overtones:`);
                    shifted2.slice(0, 3).forEach(ot => {
                        console.log(`      ${ot.frequency.toFixed(2)} Hz, amp: ${ot.amplitude.toFixed(4)}`);
                    });
                    
                    // Calculate roughness between all overtone pairs within threshold
                    let notePairRoughness = 0;
                    let notePairPairs = 0;
                    let notePairWithinThreshold = 0;
                    
                    for (const ot1 of shifted1) {
                        for (const ot2 of shifted2) {
                            pairCount++;
                            notePairPairs++;
                            const dist = Math.abs(ot1.frequency - ot2.frequency);
                            const threshold = getThreshold(Math.min(ot1.frequency, ot2.frequency));
                            
                            if (dist <= threshold) {
                                withinThresholdCount++;
                                notePairWithinThreshold++;
                                const r = roughness(ot1.frequency, ot2.frequency);
                                const weightedR = r * ot1.amplitude * ot2.amplitude;
                                totalRoughness += weightedR;
                                notePairRoughness += weightedR;
                                
                                if (notePairWithinThreshold <= 3) { // Show first few
                                    console.log(`      Rough pair: ${ot1.frequency.toFixed(2)} Hz vs ${ot2.frequency.toFixed(2)} Hz`);
                                    console.log(`        Distance: ${dist.toFixed(2)} Hz, Threshold: ${threshold.toFixed(2)} Hz`);
                                    console.log(`        Raw roughness: ${r.toFixed(6)}, Weighted: ${weightedR.toFixed(6)}`);
                                }
                            }
                        }
                    }
                    
                    console.log(`    Note pair stats: ${notePairPairs} total pairs, ${notePairWithinThreshold} within threshold`);
                    console.log(`    Note pair roughness: ${notePairRoughness.toFixed(6)}`);
                }
            }
        }
    }
    
    console.log(`\nOverall stats: ${pairCount} total pairs checked, ${withinThresholdCount} within threshold`);
    console.log(`Total roughness: ${totalRoughness.toFixed(6)}`);
    
    return totalRoughness;
}

module.exports = { debugCalculateCollectionRoughness };
