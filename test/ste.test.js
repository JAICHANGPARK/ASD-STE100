import assert from 'assert';
import {
  validateText,
  detectUnapprovedWords,
  detectPassiveVoice,
  detectNounClusters,
  splitSentences,
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

// Test 7: Unapproved words with punctuation ("and/or")
const andOr = detectUnapprovedWords('Use A and/or B.');
assert(andOr.some(u => u.word === 'and/or'), 'Expected "and/or" to be flagged');
console.log('✔ Punctuated unapproved word detection passed');

// Test 8: Noun clusters ignore prepositions, adverbs and past-tense verbs
for (const s of ['Run the database migration script now.', 'Stop the API server process before deploy.', 'Mr. Smith opened version 2.5 of the file.']) {
  const r = validateText(s);
  assert(!r.sentences.some(x => x.issues.some(i => i.type === 'NOUN_CLUSTER')), `Unexpected noun cluster in: ${s}`);
}
console.log('✔ Noun cluster false-positive guard passed');

// Test 9: Decimals and abbreviations do not split sentences
assert.strictEqual(splitSentences('Mr. Smith opened version 2.5 of the file. Then he left.').length, 2);
assert.strictEqual(splitSentences('Use a cache, e.g. Redis. It works.').length, 2);
console.log('✔ Sentence splitting passed');

// Test 10: Adjectival participles are not passive voice
assert.strictEqual(detectPassiveVoice('The users are tired.'.split(/\s+/)).length, 0);
console.log('✔ Adjectival participle guard passed');

// Test 11: Strict mode flags progressive and perfect tenses; pragmatic mode does not
const tenseStrict = validateText('The server is running. The worker has processed the job.', { mode: 'strict' });
assert.strictEqual(tenseStrict.sentences.filter(x => x.issues.some(i => i.type === 'VERB_TENSE')).length, 2);
const tensePragmatic = validateText('The server is running.', { mode: 'pragmatic' });
assert(!tensePragmatic.sentences[0].issues.some(i => i.type === 'VERB_TENSE'));
console.log('✔ Verb tense detection passed');

// Test 12: Pragmatic mode caps every sentence at 25 words
const twentySix = Array.from({ length: 26 }, () => 'word').join(' ') + '.';
assert(validateText(twentySix).sentences[0].issues.some(i => i.type === 'SENTENCE_LENGTH'));
console.log('✔ Pragmatic 25-word cap passed');

// Test 13: Passive voice is permitted in descriptive text only when the agent is unknown (STE 3.6)
const unknownAgent = validateText('The packets are encrypted.', { mode: 'strict' });
assert.strictEqual(unknownAgent.score, 100);
assert(unknownAgent.sentences[0].issues.some(i => i.type === 'PASSIVE_VOICE' && i.permitted));
const knownAgent = validateText('The packets are encrypted by the proxy.', { mode: 'strict' });
assert(knownAgent.sentences[0].issues.some(i => i.type === 'PASSIVE_VOICE' && i.severity === 'error'));
console.log('✔ Passive voice exception passed');

// Test 14: Semicolons, contractions, Latin abbreviations and phrasal verbs
const typesOf = (text, mode) => validateText(text, { mode }).sentences.flatMap(x => x.issues.map(i => i.type));
assert.deepStrictEqual(typesOf("Set up the server; then don't stop it, e.g. now.", 'strict').sort(),
  ['CONTRACTION', 'LATIN_ABBREVIATION', 'PHRASAL_VERB', 'SEMICOLON']);
assert(!typesOf("Don't stop it, e.g. now.", 'pragmatic').includes('CONTRACTION'));
console.log('✔ Punctuation and style checks passed');

// Test 15: Paragraphs have a maximum of 6 sentences
assert(typesOf('A one. B two. C three. D four. E five. F six. G seven.', 'strict').includes('PARAGRAPH_LENGTH'));
assert(!typesOf('A one. B two. C three.\n\nD four. E five. F six. G seven.', 'strict').includes('PARAGRAPH_LENGTH'));
console.log('✔ Paragraph length check passed');

console.log('\nAll tests passed successfully!');
