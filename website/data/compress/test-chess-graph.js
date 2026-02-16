#!/usr/bin/env node

/**
 * Test script for chess graph encoding/decoding
 */

const { encodeChessGraph, parseData } = require('./encode-chess-graph');

console.log('=== Chess Graph Encoding Test ===\n');

// Create sample test data matching the real format
// Format: [count, {move: targetIndex, ...}, count, {move: targetIndex, ...}, ...]
const testDataRaw = [
  6968, {'d3': 7, 'O-O': 686, 'd4': 7380, 'Qe2': 31804, 'Nc3': 63803},
  1171, {'Bc5': 8, 'd6': 5632, 'Ne7': 99180},
  1025, {'c3': 9, 'O-O': 11006, 'Bxc6': 25788, 'Nbd2': 82945, 'Nc3': 94394, 'Ba4': 146249, 'Bg5': 173617},
  488, {'O-O': 10, 'd6': 39246, 'd5': 75412},
  428, {'O-O': 11, 'Bxc6': 21366, 'Nbd2': 96595, 'Bg5': 150624},
  100, {}, // Empty moves
  50, null, // Null moves
  75, {'e4': 0} // Single move
];

console.log('Test data (8 positions):');
for (let i = 0; i < testDataRaw.length; i += 2) {
  const count = testDataRaw[i];
  const moves = testDataRaw[i + 1];
  console.log(`  ${i/2}: count=${count}, moves=${JSON.stringify(moves)}`);
}
console.log('');

// Parse data
console.log('Parsing data...');
const positions = parseData(testDataRaw);
console.log(`✓ Parsed ${positions.length} positions`);
console.log('');

// Encode
console.log('Encoding data...');
const { moves, data: encodedData } = encodeChessGraph(positions);
console.log(`✓ Encoded successfully`);
console.log(`  Unique moves: ${moves.length}`);
console.log(`  Move dictionary: ${JSON.stringify(moves)}`);
console.log('');

// Show encoded format
console.log('Encoded positions:');
encodedData.forEach((encoded, i) => {
  console.log(`  ${i}: ${JSON.stringify(encoded)}`);
});
console.log('');

// Decode function (matching client logic)
function decode(flatArray, moveDict) {
  if (!flatArray || flatArray.length === 0) {
    return null;
  }
  
  const count = flatArray[0];
  
  if (flatArray.length === 1) {
    return { count, moves: {} };
  }
  
  const moves = {};
  
  for (let i = 1; i < flatArray.length; i += 2) {
    const moveIndex = flatArray[i];
    const targetIndex = flatArray[i + 1];
    moves[moveDict[moveIndex]] = targetIndex;
  }
  
  return { count, moves };
}

// Test decoding
console.log('Testing decode...');
let passCount = 0;
let failCount = 0;

positions.forEach((original, i) => {
  const encoded = encodedData[i];
  const decoded = decode(encoded, moves);
  
  // Compare
  const originalStr = JSON.stringify(original);
  const decodedStr = JSON.stringify(decoded);
  
  if (originalStr === decodedStr) {
    console.log(`  ✓ Position ${i}: PASS`);
    passCount++;
  } else {
    console.log(`  ✗ Position ${i}: FAIL`);
    console.log(`    Original: ${originalStr}`);
    console.log(`    Decoded:  ${decodedStr}`);
    failCount++;
  }
});

console.log('');

// Test size comparison
const originalSize = JSON.stringify(testDataRaw).length;
const encodedSize = JSON.stringify({ moves, data: encodedData }).length;
const reduction = ((1 - encodedSize / originalSize) * 100).toFixed(1);

console.log('=== Size Comparison ===');
console.log(`Original: ${originalSize} bytes`);
console.log(`Encoded: ${encodedSize} bytes`);
console.log(`Reduction: ${reduction}%`);
console.log('');

console.log('=== Test Results ===');
console.log(`Pass: ${passCount}/${positions.length}`);
console.log(`Fail: ${failCount}/${positions.length}`);

if (failCount === 0) {
  console.log('\n✓ All tests passed! 🎉');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
