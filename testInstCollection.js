const { InstCollection } = require('./instCollection');

// Example varied parameters for each instrument
const lowParams = {
    fundamental: 110, // A2
    harmonicPurity: 0.9,
    spectralBalance: 0.3,
    oddEvenBias: 0.2,
    formantStrength: 0.1,
    spectralRichness: 0.5,
    irregularity: 0.05,
    maxHarmonics: 16
};

const midParams = {
    fundamental: 220, // A3
    harmonicPurity: 0.7,
    spectralBalance: 0.6,
    oddEvenBias: 0.5,
    formantStrength: 0.3,
    spectralRichness: 0.7,
    irregularity: 0.1,
    maxHarmonics: 16
};

const highParams = {
    fundamental: 440, // A4
    harmonicPurity: 0.5,
    spectralBalance: 0.8,
    oddEvenBias: 0.8,
    formantStrength: 0.6,
    spectralRichness: 0.9,
    irregularity: 0.15,
    maxHarmonics: 16
};

console.log('--- Instantiating InstCollection with varied parameters ---');
const insts = new InstCollection(lowParams, midParams, highParams);

console.log('\n--- Visualizing Overtone Series for Low, Mid, High ---');
insts.visualizeAll();

console.log('\n--- Overtone Series Data ---');
const series = insts.getOvertoneSeries();
console.log('Low:', series.low);
console.log('Mid:', series.mid);
console.log('High:', series.high);
