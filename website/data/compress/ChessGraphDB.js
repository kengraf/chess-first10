/**
 * ChessGraphDB - Client-side loader for compressed chess graph data
 * 
 * Data structure: Each position has a count and moves to other positions
 * - count: frequency (how many times this position occurred)
 * - moves: {moveName: targetPositionIndex, ...}
 * 
 * Features:
 * - Lazy loading of chunks
 * - LRU cache with configurable size
 * - Automatic decompression (gzip)
 * - Move dictionary decoding
 * - Graph traversal helpers
 */

class ChessGraphDB {
  constructor(options = {}) {
    this.basePath = options.basePath || '/data';
    this.chunkSize = options.chunkSize || 10000;
    this.maxCachedChunks = options.maxCachedChunks || 20;
    
    this.moves = [];
    this.cache = new Map();
    this.accessOrder = [];
    this.loading = new Map();
    this.initialized = false;
    this.metadata = null;
  }
  
  /**
   * Initialize the database by loading the move dictionary
   */
  async init() {
    if (this.initialized) {
      return;
    }
    
    try {
      console.log('Loading move dictionary...');
      const dictResponse = await fetch(`${this.basePath}/moves-dict.json.gz`);
      
      if (!dictResponse.ok) {
        throw new Error(`Failed to load dictionary: ${dictResponse.status}`);
      }
      
      this.moves = await dictResponse.json();
      
      // Load metadata if available
      try {
        const metaResponse = await fetch(`${this.basePath}/metadata.json`);
        if (metaResponse.ok) {
          this.metadata = await metaResponse.json();
        }
      } catch (e) {
        // Metadata is optional
      }
      
      this.initialized = true;
      
      console.log(`✓ Loaded dictionary with ${this.moves.length} moves`);
      if (this.metadata) {
        console.log(`  Total positions: ${this.metadata.totalPositions.toLocaleString()}`);
      }
    } catch (error) {
      console.error('Failed to initialize chess database:', error);
      throw error;
    }
  }
  
  /**
   * Get position data by index
   * @param {number} index - Position index (0 to N-1)
   * @returns {Promise<Object|null>} {count: number, moves: {moveName: targetIndex, ...}}
   */
  async get(index) {
    if (!this.initialized) {
      await this.init();
    }
    
    const chunkIndex = Math.floor(index / this.chunkSize);
    const localIndex = index % this.chunkSize;
    
    const chunk = await this.getChunk(chunkIndex);
    
    if (!chunk || !chunk[localIndex]) {
      return null;
    }
    
    return this.decode(chunk[localIndex]);
  }
  
  /**
   * Get multiple positions at once
   * @param {number[]} indices - Array of position indices
   * @returns {Promise<Object[]>} Array of {index, count, moves}
   */
  async getMany(indices) {
    if (!this.initialized) {
      await this.init();
    }
    
    // Group by chunk
    const chunkGroups = new Map();
    
    indices.forEach(index => {
      const chunkIndex = Math.floor(index / this.chunkSize);
      const localIndex = index % this.chunkSize;
      
      if (!chunkGroups.has(chunkIndex)) {
        chunkGroups.set(chunkIndex, []);
      }
      
      chunkGroups.get(chunkIndex).push({ index, localIndex });
    });
    
    // Load all needed chunks
    await Promise.all(
      Array.from(chunkGroups.keys()).map(idx => this.getChunk(idx))
    );
    
    // Decode all positions
    const results = [];
    
    for (const [chunkIndex, items] of chunkGroups) {
      const chunk = this.cache.get(chunkIndex);
      
      items.forEach(({ index, localIndex }) => {
        const decoded = chunk && chunk[localIndex] 
          ? this.decode(chunk[localIndex])
          : null;
        
        results.push({ 
          index, 
          count: decoded?.count || 0,
          moves: decoded?.moves || {}
        });
      });
    }
    
    return results;
  }
  
  /**
   * Traverse the graph from a starting position
   * @param {number} startIndex - Starting position index
   * @param {number} maxDepth - Maximum depth to traverse (default: 3)
   * @returns {Promise<Object>} Tree structure of positions
   */
  async traverse(startIndex, maxDepth = 3) {
    if (!this.initialized) {
      await this.init();
    }
    
    const visited = new Set();
    
    async function traverseRecursive(db, index, depth) {
      if (depth > maxDepth || visited.has(index)) {
        return null;
      }
      
      visited.add(index);
      const position = await db.get(index);
      
      if (!position) {
        return null;
      }
      
      const node = {
        index,
        count: position.count,
        moves: {}
      };
      
      if (depth < maxDepth) {
        // Recursively get child positions
        for (const [move, targetIndex] of Object.entries(position.moves)) {
          const child = await traverseRecursive(db, targetIndex, depth + 1);
          if (child) {
            node.moves[move] = child;
          }
        }
      } else {
        // At max depth, just include the indices
        node.moves = position.moves;
      }
      
      return node;
    }
    
    return traverseRecursive(this, startIndex, 0);
  }
  
  /**
   * Get all possible moves from a position
   * @param {number} index - Position index
   * @returns {Promise<Array>} [{move: string, targetIndex: number, count: number}, ...]
   */
  async getAvailableMoves(index) {
    const position = await this.get(index);
    
    if (!position || !position.moves) {
      return [];
    }
    
    // Get counts for target positions
    const targetIndices = Object.values(position.moves);
    const targets = await this.getMany(targetIndices);
    const targetCounts = new Map(targets.map(t => [t.index, t.count]));
    
    // Build result
    const moves = [];
    for (const [move, targetIndex] of Object.entries(position.moves)) {
      moves.push({
        move,
        targetIndex,
        count: targetCounts.get(targetIndex) || 0
      });
    }
    
    // Sort by count (most common first)
    moves.sort((a, b) => b.count - a.count);
    
    return moves;
  }
  
  /**
   * Preload chunks for given position indices
   */
  async preload(indices) {
    if (!this.initialized) {
      await this.init();
    }
    
    const chunkIndices = new Set(
      indices.map(i => Math.floor(i / this.chunkSize))
    );
    
    console.log(`Preloading ${chunkIndices.size} chunks...`);
    
    await Promise.all(
      Array.from(chunkIndices).map(idx => this.getChunk(idx))
    );
    
    console.log('✓ Preload complete');
  }
  
  /**
   * Get a chunk (from cache or fetch)
   * @private
   */
  async getChunk(chunkIndex) {
    // Return from cache
    if (this.cache.has(chunkIndex)) {
      this.updateAccessOrder(chunkIndex);
      return this.cache.get(chunkIndex);
    }
    
    // Check if already loading
    if (this.loading.has(chunkIndex)) {
      return this.loading.get(chunkIndex);
    }
    
    // Fetch chunk
    const loadPromise = this.fetchChunk(chunkIndex);
    this.loading.set(chunkIndex, loadPromise);
    
    try {
      const chunk = await loadPromise;
      
      // Add to cache
      this.cache.set(chunkIndex, chunk);
      this.accessOrder.push(chunkIndex);
      
      // Evict oldest if cache is full
      if (this.cache.size > this.maxCachedChunks) {
        const oldest = this.accessOrder.shift();
        this.cache.delete(oldest);
        console.log(`Evicted chunk ${oldest} from cache`);
      }
      
      return chunk;
    } finally {
      this.loading.delete(chunkIndex);
    }
  }
  
  /**
   * Fetch a chunk from server
   * @private
   */
  async fetchChunk(chunkIndex) {
    const url = `${this.basePath}/chunks/chunk-${chunkIndex}.json.gz`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const chunk = await response.json();
      console.log(`✓ Loaded chunk ${chunkIndex} (${chunk.length} positions)`);
      
      return chunk;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
      throw error;
    }
  }
  
  /**
   * Decode a flattened position array
   * Format: [count, moveIdx1, targetIdx1, moveIdx2, targetIdx2, ...]
   * @private
   */
  decode(flatArray) {
    if (!flatArray || flatArray.length === 0) {
      return null;
    }
    
    const count = flatArray[0];
    
    if (flatArray.length === 1) {
      // Only count, no moves
      return { count, moves: {} };
    }
    
    const moves = {};
    
    // Decode moves: [moveIdx, targetIdx, moveIdx, targetIdx, ...]
    for (let i = 1; i < flatArray.length; i += 2) {
      const moveIndex = flatArray[i];
      const targetIndex = flatArray[i + 1];
      
      if (moveIndex < this.moves.length) {
        moves[this.moves[moveIndex]] = targetIndex;
      }
    }
    
    return { count, moves };
  }
  
  /**
   * Update LRU access order
   * @private
   */
  updateAccessOrder(chunkIndex) {
    const index = this.accessOrder.indexOf(chunkIndex);
    
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    this.accessOrder.push(chunkIndex);
  }
  
  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.accessOrder = [];
    console.log('Cache cleared');
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      totalMoves: this.moves.length,
      totalPositions: this.metadata?.totalPositions || null,
      cachedChunks: this.cache.size,
      maxCachedChunks: this.maxCachedChunks,
      loadingChunks: this.loading.size,
      cacheOrder: [...this.accessOrder]
    };
  }
}

// Export for both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessGraphDB;
}

if (typeof window !== 'undefined') {
  window.ChessGraphDB = ChessGraphDB;
}
