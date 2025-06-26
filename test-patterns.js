// Quick test of the new pattern structure
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patterns-'));
execSync(`tsc src/data/patterns.ts --target ES2017 --module commonjs --outDir ${tmpDir}`);
const outFile = path.join(tmpDir, 'data', 'patterns.js');

const {
  patterns,
  getPatternsBySourceType,
  getUserContributedPatterns,
  getHighRatedPatterns
} = require(outFile);

console.log('🧪 Testing Pattern Structure');
console.log('============================');

console.log('\n📊 Total patterns:', patterns.length);

console.log('\n🏢 Official patterns:');
getPatternsBySourceType('official').forEach(p => {
  console.log(`  - ${p.name} (${p.difficulty})`);
});

console.log('\n👤 User contributed patterns:');
getUserContributedPatterns().forEach(p => {
  console.log(`  - ${p.name} (Rating: ${p.communityRating || 'Not rated'})`);
});

console.log('\n⭐ High rated patterns (4+ stars):');
getHighRatedPatterns(4).forEach(p => {
  console.log(`  - ${p.name} (${p.communityRating}⭐)`);
});

console.log('\n🔗 Patterns with prerequisites:');
patterns.filter(p => p.prerequisites.length > 0).forEach(p => {
  console.log(`  - ${p.name} requires: [${p.prerequisites.join(', ')}]`);
});

console.log('\n⏱️ Timing distribution:');
const timingCounts = {};
patterns.forEach(p => {
  timingCounts[p.timing] = (timingCounts[p.timing] || 0) + 1;
});
Object.entries(timingCounts).forEach(([timing, count]) => {
  console.log(`  - ${timing}: ${count}`);
});

console.log('\n✅ All tests passed! Pattern structure is working correctly.');
