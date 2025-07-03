// Test script for the new pattern library
const { PatternLibraryService, CURRICULUM_PATTERNS } = require('./src/services/patternLibrary.ts');

console.log('Testing Pattern Library...\n');

// Test pattern count
console.log(`Total patterns loaded: ${CURRICULUM_PATTERNS.length}`);

// Test patterns by difficulty
const beginnerPatterns = PatternLibraryService.getPatternsByDifficulty('Beginner');
const intermediatePatterns = PatternLibraryService.getPatternsByDifficulty('Intermediate');
const advancedPatterns = PatternLibraryService.getPatternsByDifficulty('Advanced');

console.log(`Beginner patterns: ${beginnerPatterns.length}`);
console.log(`Intermediate patterns: ${intermediatePatterns.length}`);
console.log(`Advanced patterns: ${advancedPatterns.length}`);

// Test patterns by tags
const soloPatterns = PatternLibraryService.getPatternsByTag('solo');
const partnerPatterns = PatternLibraryService.getPatternsByTag('partner');
const zapPatterns = PatternLibraryService.getPatternsByTag('zap');

console.log(`\nSolo patterns: ${soloPatterns.length}`);
console.log(`Partner patterns: ${partnerPatterns.length}`);
console.log(`Zap patterns: ${zapPatterns.length}`);

// Test patterns by juggler count
const oneJugglerPatterns = PatternLibraryService.getPatternsByJugglerCount(1);
const twoJugglerPatterns = PatternLibraryService.getPatternsByJugglerCount(2);

console.log(`\n1 juggler patterns: ${oneJugglerPatterns.length}`);
console.log(`2 juggler patterns: ${twoJugglerPatterns.length}`);

// Test search functionality
const cascadeSearch = PatternLibraryService.searchPatterns('cascade');
const passingSearch = PatternLibraryService.searchPatterns('pass');

console.log(`\nCascade search results: ${cascadeSearch.length}`);
console.log(`Passing search results: ${passingSearch.length}`);

// Display some sample patterns
console.log('\nSample patterns:');
console.log('================');

// Show first solo pattern
const firstSolo = soloPatterns[0];
if (firstSolo) {
  console.log(`\nSOLO: ${firstSolo.name}`);
  console.log(`Difficulty: ${firstSolo.difficulty}`);
  console.log(`Description: ${firstSolo.description}`);
  console.log(`Tags: ${firstSolo.tags.join(', ')}`);
}

// Show first partner pattern
const firstPartner = partnerPatterns[0];
if (firstPartner) {
  console.log(`\nPARTNER: ${firstPartner.name}`);
  console.log(`Difficulty: ${firstPartner.difficulty}`);
  console.log(`Description: ${firstPartner.description}`);
  console.log(`Tags: ${firstPartner.tags.join(', ')}`);
}

// Show progression for beginners
const beginnerProgression = PatternLibraryService.getBeginnerProgression();
console.log(`\nBeginner progression (${beginnerProgression.length} patterns):`);
beginnerProgression.slice(0, 5).forEach((pattern, index) => {
  console.log(`${index + 1}. ${pattern.name} (${pattern.difficulty})`);
});

console.log('\nPattern Library test completed successfully!');
