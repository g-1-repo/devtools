#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getFileSize(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function analyzeBundle() {
  const distDir = path.join(__dirname, '../dist');
  
  if (!fs.existsSync(distDir)) {
    console.error('❌ Dist directory not found. Run `bun run build` first.');
    return;
  }

  console.log('\n📊 Bundle Analysis Report\n');
  console.log('=' .repeat(50));

  // Analyze main entry points
  const entryPoints = [
    'index.js', 'array/index.js', 'async/index.js', 'crypto/index.js',
    'database/index.js', 'date/index.js', 'debug/index.js', 'http/index.js',
    'math/index.js', 'node/index.js', 'object/index.js', 'string/index.js',
    'types/index.js', 'validation/index.js', 'web/index.js',
    'api/index.js', 'env/index.js', 'validation/core.js', 'validation/web.js'
  ];

  let totalSize = 0;
  const results = [];

  entryPoints.forEach(entry => {
    const esm = path.join(distDir, entry);
    const cjs = path.join(distDir, entry.replace('.js', '.cjs'));
    const dts = path.join(distDir, entry.replace('.js', '.d.ts'));

    const esmSize = getFileSize(esm);
    const cjsSize = getFileSize(cjs);
    const dtsSize = getFileSize(dts);

    if (esmSize > 0 || cjsSize > 0) {
      results.push({
        entry,
        esm: esmSize,
        cjs: cjsSize,
        dts: dtsSize,
        total: esmSize + cjsSize + dtsSize
      });
      totalSize += esmSize + cjsSize + dtsSize;
    }
  });

  // Sort by total size descending
  results.sort((a, b) => b.total - a.total);

  console.log('Entry Point'.padEnd(20) + 'ESM'.padEnd(10) + 'CJS'.padEnd(10) + 'DTS'.padEnd(10) + 'Total');
  console.log('-'.repeat(50));

  results.forEach(result => {
    console.log(
      result.entry.padEnd(20) +
      formatBytes(result.esm).padEnd(10) +
      formatBytes(result.cjs).padEnd(10) +
      formatBytes(result.dts).padEnd(10) +
      formatBytes(result.total)
    );
  });

  console.log('-'.repeat(50));
  console.log('TOTAL:'.padEnd(40) + formatBytes(totalSize));

  // Analyze chunks
  const chunksDir = path.join(distDir, 'chunks')
  let chunks = []
  if (fs.existsSync(chunksDir)) {
    chunks = fs.readdirSync(chunksDir)
      .filter(file => file.endsWith('.js') || file.endsWith('.cjs'))
      .map(file => ({
        name: file,
        size: getFileSize(path.join(chunksDir, file))
      }))
      .sort((a, b) => b.size - a.size);

    if (chunks.length > 0) {
      console.log('\n📦 Chunk Analysis');
      console.log('-'.repeat(30));
      chunks.forEach(chunk => {
        console.log(`${chunk.name.padEnd(20)} ${formatBytes(chunk.size)}`);
      });

      const totalChunkSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
      console.log('-'.repeat(30));
      console.log(`Total chunks: ${formatBytes(totalChunkSize)}`);
    }
  }

  // Bundle size recommendations
  console.log('\n💡 Recommendations')
  console.log('-'.repeat(20))
  
  const mainBundle = results.find(r => r.entry === 'index.js')
  if (mainBundle && mainBundle.esm > 10 * 1024) {
    console.log('⚠️  Main bundle is getting large. Consider splitting functionality.')
  }

  const largeBundles = results.filter(r => r.esm > 2 * 1024)
  if (largeBundles.length > 3) {
    console.log('⚠️  Multiple large bundles detected. Review tree-shaking configuration.')
  }

  // Analyze potential savings
  const totalChunkSize = chunks.length > 0 ? chunks.reduce((acc, chunk) => acc + chunk.size, 0) : 0
  const compressionRatio = totalSize > 0 ? (totalChunkSize / totalSize * 100).toFixed(1) : '0'
  
  console.log(`📈 Code splitting efficiency: ${compressionRatio}% of total size is in shared chunks`)
  
  if (chunks.length > 0) {
    const largeChunks = chunks.filter(c => c.size > 5 * 1024)
    if (largeChunks.length > 0) {
      console.log(`📦 ${largeChunks.length} large chunk(s) detected - consider further splitting`)
    }
  }

  console.log('✅ Bundle analysis complete!\n')
}

if (require.main === module) {
  analyzeBundle();
}

module.exports = { analyzeBundle };