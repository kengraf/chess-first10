#!/usr/bin/env node

/**
 * Encodes chess position graph data and splits into compressed chunks
 * Data format: [count, {move: nextIndex, ...}, count, {move: nextIndex, ...}, ...]
 * Usage: node encode-chess-graph.js input.json output-dir
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Configuration
const CHUNK_SIZE = 10000; // Positions per chunk

/**
 * Parse the input data into structured format
 */
function parseData(data) {
  const positions = [];
  
  for (let i = 0; i < data.length; i += 2) {
    const count = data[i];
    const moves = data[i + 1];
    
    positions.push({
      count: count,
      moves: moves || {}
    });
  }
  
  return positions;
}

/**
 * Encode chess graph data using move dictionary compression
 */
function encodeChessGraph(positions) {
  console.log('Building move dictionary...');
  
  const moveDict = new Map();
  const moves = [];
  let moveIndex = 0;
  
  // Build move dictionary from all unique moves
  positions.forEach((position, idx) => {
    if (idx % 100000 === 0) {
      console.log(`  Processing position ${idx}/${positions.length}`);
    }
    
    if (position.moves && typeof position.moves === 'object') {
      Object.keys(position.moves).forEach(move => {
        if (!moveDict.has(move)) {
          moveDict.set(move, moveIndex++);
          moves.push(move);
        }
      });
    }
  });
  
  console.log(`  Found ${moves.length} unique moves`);
  
  // Encode positions
  console.log('Encoding positions...');
  const encoded = positions.map((position, idx) => {
    if (idx % 100000 === 0) {
      console.log(`  Encoding position ${idx}/${positions.length}`);
    }
    
    if (!position.moves || Object.keys(position.moves).length === 0) {
      // Empty moves: [count]
      return [position.count];
    }
    
    // Format: [count, moveIdx1, targetIdx1, moveIdx2, targetIdx2, ...]
    const flat = [position.count];
    
    for (const [move, targetIndex] of Object.entries(position.moves)) {
      flat.push(moveDict.get(move), targetIndex);
    }
    
    return flat;
  });
  
  return { moves, data: encoded };
}

/**
 * Split encoded data into chunks
 */
function splitIntoChunks(data, chunkSize) {
  const chunks = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Save chunks with gzip compression
 */
function saveChunks(chunks, outputDir) {
  const chunksDir = path.join(outputDir, 'chunks');
  
  // Create directories
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }
  
  console.log(`Saving ${chunks.length} chunks...`);
  
  let totalOriginal = 0;
  let totalCompressed = 0;
  
  chunks.forEach((chunk, index) => {
    // Save as JSON
    const jsonData = JSON.stringify(chunk);
    const jsonPath = path.join(chunksDir, `chunk-${index}.json`);
    fs.writeFileSync(jsonPath, jsonData);
    
    // Save as gzipped JSON
    const compressed = zlib.gzipSync(jsonData);
    const gzPath = path.join(chunksDir, `chunk-${index}.json.gz`);
    fs.writeFileSync(gzPath, compressed);
    
    totalOriginal += jsonData.length;
    totalCompressed += compressed.length;
    
    const originalSize = (jsonData.length / 1024).toFixed(2);
    const compressedSize = (compressed.length / 1024).toFixed(2);
    const ratio = ((1 - compressed.length / jsonData.length) * 100).toFixed(1);
    
    if (index % 10 === 0 || index === chunks.length - 1) {
      console.log(`  Chunk ${index}: ${originalSize}KB → ${compressedSize}KB (${ratio}% reduction)`);
    }
  });
  
  return { totalOriginal, totalCompressed };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node encode-chess-graph.js <input.json> <output-dir>');
    console.error('Example: node encode-chess-graph.js chess-data.json ./public/data');
    process.exit(1);
  }
  
  const [inputFile, outputDir] = args;
  
  // Validate input file
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  console.log('=== Chess Graph Data Encoder ===');
  console.log(`Input: ${inputFile}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Chunk size: ${CHUNK_SIZE} positions`);
  console.log('');
  
  // Load data
  console.log('Loading data...');
  const startTime = Date.now();
  const rawData = fs.readFileSync(inputFile, 'utf8');
  const originalSize = (rawData.length / 1024 / 1024).toFixed(2);
  console.log(`  Loaded ${originalSize}MB`);
  
  const data = JSON.parse(rawData);
  console.log(`  Raw array length: ${data.length}`);
  
  // Parse into positions
  console.log('Parsing positions...');
  const positions = parseData(data);
  console.log(`  Total positions: ${positions.length}`);
  console.log('');
  
  // Show sample
  console.log('Sample positions:');
  positions.slice(0, 3).forEach((pos, i) => {
    console.log(`  ${i}: count=${pos.count}, moves=${JSON.stringify(pos.moves)}`);
  });
  console.log('');
  
  // Encode
  const { moves, data: encodedData } = encodeChessGraph(positions);
  console.log('');
  
  // Split into chunks
  console.log('Splitting into chunks...');
  const chunks = splitIntoChunks(encodedData, CHUNK_SIZE);
  console.log(`  Created ${chunks.length} chunks`);
  console.log('');
  
  // Save chunks
  const { totalOriginal, totalCompressed } = saveChunks(chunks, outputDir);
  console.log('');
  
  // Save move dictionary
  console.log('Saving move dictionary...');
  const movesPath = path.join(outputDir, 'moves-dict.json');
  fs.writeFileSync(movesPath, JSON.stringify(moves));
  
  const movesDictGz = zlib.gzipSync(JSON.stringify(moves));
  const movesDictGzPath = path.join(outputDir, 'moves-dict.json.gz');
  fs.writeFileSync(movesDictGzPath, movesDictGz);
  
  const dictSize = (JSON.stringify(moves).length / 1024).toFixed(2);
  const dictGzSize = (movesDictGz.length / 1024).toFixed(2);
  console.log(`  Dictionary: ${dictSize}KB → ${dictGzSize}KB (compressed)`);
  console.log('');
  
  // Save metadata
  const metadata = {
    totalPositions: positions.length,
    uniqueMoves: moves.length,
    chunkSize: CHUNK_SIZE,
    totalChunks: chunks.length,
    encodedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const overallRatio = ((1 - (totalCompressed + movesDictGz.length) / (totalOriginal + JSON.stringify(moves).length)) * 100).toFixed(1);
  
  console.log('=== Summary ===');
  console.log(`Total positions: ${positions.length.toLocaleString()}`);
  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Unique moves: ${moves.length}`);
  console.log(`Original size: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Compressed size: ${(totalCompressed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Overall reduction: ${overallRatio}%`);
  console.log(`Time elapsed: ${elapsed}s`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');
  console.log('Done! ✓');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { encodeChessGraph, parseData, splitIntoChunks };
