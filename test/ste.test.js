import assert from 'assert';
import {
  validateText,
  detectUnapprovedWords,
  detectPassiveVoice,
  detectNounClusters,
  buildSystemPrompt
} from '../lib/ste-engine.js';

console.log('Testing ASD-STE100 Rule Engine...');

// Test 1: Detect unapproved words
const unapproved = detectUnapprovedWords('You should utilize this script prior to commencing the process, as well as terminate it properly.');
assert(unapproved.length >= 4, `Expected at least 4 unapproved words, found ${unapproved.length}`);
console.log('✔ Unapproved words detection passed');

// Test 2: Detect passive voice
const passiveSentence = 'The configuration file was modified by the engineer and the test was executed.';
const words = passiveSentence.split(/\s+/);
const passiveIssues = detectPassiveVoice(words);
assert(passiveIssues.length >= 2, `Expected at least 2 passive voice issues, found ${passiveIssues.length}`);
console.log('✔ Passive voice detection passed');

// Test 3: Detect noun clusters
const clusterWords = ['aircraft', 'fuel', 'pump', 'housing', 'valve', 'assembly'];
const clusterIssues = detectNounClusters(clusterWords);
assert(clusterIssues.length > 0, 'Expected noun cluster warning');
console.log('✔ Noun cluster detection passed');

// Test 4: Sentence length validator
const longSentence = 'This is an extraordinarily long technical descriptive sentence designed specifically to exceed the maximum permitted word count of twenty-five words established by the international ASD-STE100 specification for technical documentation.';
const report = validateText(longSentence, { mode: 'strict' });
assert(report.sentences[0].issues.some(i => i.type === 'SENTENCE_LENGTH'), 'Expected sentence length warning');
console.log('✔ Sentence length validation passed');

// Test 5: Good STE sentence
const goodSTE = 'Open the valve. The oil flows into the tank.';
const goodReport = validateText(goodSTE, { mode: 'pragmatic' });
assert(goodReport.score >= 90, `Expected high score for clean STE, got ${goodReport.score}`);
console.log('✔ Clean STE validation passed (Score:', goodReport.score, ')');

// Test 6: System prompt builder
const prompt80 = buildSystemPrompt({ mode: 'pragmatic', targetFormat: 'diagram' });
assert(prompt80.includes('80% ASD-STE100'));
assert(prompt80.includes('Mermaid'));
console.log('✔ Prompt builder passed');

console.log('\nAll tests passed successfully!');
