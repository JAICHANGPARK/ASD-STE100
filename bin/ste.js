#!/usr/bin/env node
import { validateText, buildSystemPrompt } from '../lib/ste-engine.js';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
ASD-STE100 - Simplified Technical English Toolkit (Claude Code Mod & Skill)
Inspired by Andrej Karpathy's controlled language LLM guidance.

Usage:
  asd-ste100 check <text-or-file> [--strict]
  asd-ste100 prompt [--strict] [--diagram] [--html]
  asd-ste100 help

Commands:
  check      Lint and validate text against ASD-STE100 guidelines
  prompt     Print system prompt instruction to give to any LLM
  help       Display this message

Options:
  --strict   Enforce 100% ASD-STE100 standard (default is 80% pragmatic mode)
  --diagram  Request output with Mermaid diagrams
  --html     Request output as an interactive HTML document
`);
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'prompt') {
  const isStrict = args.includes('--strict');
  const targetFormat = args.includes('--diagram') ? 'diagram' : (args.includes('--html') ? 'html' : 'text');
  console.log(buildSystemPrompt({ mode: isStrict ? 'strict' : 'pragmatic', targetFormat }));
  process.exit(0);
}

if (command === 'check') {
  const isStrict = args.includes('--strict');
  const targetIndex = args.findIndex((a, idx) => idx > 0 && !a.startsWith('--'));
  
  if (targetIndex === -1) {
    console.error('Error: Please provide text or a file path to check.');
    console.error('Example: asd-ste100 check "You should utilize this script."');
    process.exit(1);
  }

  let textToCheck = args[targetIndex];
  
  // If argument is an existing file, read it
  if (fs.existsSync(textToCheck)) {
    try {
      textToCheck = fs.readFileSync(textToCheck, 'utf8');
    } catch (err) {
      console.error(`Error reading file ${textToCheck}:`, err.message);
      process.exit(1);
    }
  }

  const result = validateText(textToCheck, { mode: isStrict ? 'strict' : 'pragmatic' });
  
  console.log('\n========================================');
  console.log(` ASD-STE100 Compliance Report (${result.mode.toUpperCase()} MODE)`);
  console.log('========================================\n');
  console.log(`Score: ${result.score} / 100`);
  console.log(`Total sentences: ${result.totalSentences}`);
  console.log(`Total words: ${result.totalWords} (Avg: ${result.averageWordsPerSentence} words/sentence)`);
  console.log(`Total issues identified: ${result.totalIssues}\n`);

  if (result.sentences.length > 0) {
    console.log('--- Sentence Analysis ---');
    result.sentences.forEach(s => {
      const statusIcon = s.issues.length === 0 ? '✔' : '⚠';
      console.log(`\n[Sentence ${s.index}] (${s.wordCount} words) ${statusIcon}`);
      console.log(`"${s.text}"`);
      if (s.issues.length > 0) {
        s.issues.forEach(issue => {
          console.log(`   - [${issue.type}] ${issue.message}`);
          if (issue.suggestion) {
            console.log(`     Suggestion: ${issue.suggestion}`);
          }
        });
      }
    });
  }

  console.log('\n========================================\n');
  process.exit(result.totalIssues > 0 && isStrict ? 1 : 0);
}

printHelp();
