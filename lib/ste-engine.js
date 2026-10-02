/**
 * ASD-STE100 (Simplified Technical English) Rule Engine & Validator
 * 
 * Implements core checking rules based on the ASD-STE100 Specification (Issue 8)
 * and Andrej Karpathy's "80% Pragmatic Mode" for LLM clarity.
 */

// Common unapproved words in ASD-STE100 and their recommended replacements
const UNAPPROVED_WORDS = {
  'utilize': 'use',
  'utilizes': 'uses',
  'utilized': 'used',
  'utilizing': 'using',
  'utilization': 'use',
  'terminate': 'stop',
  'terminates': 'stops',
  'terminated': 'stopped',
  'terminating': 'stopping',
  'commence': 'start',
  'commences': 'starts',
  'commenced': 'started',
  'commencing': 'starting',
  'initiate': 'start',
  'initiates': 'starts',
  'initiated': 'started',
  'initiating': 'starting',
  'shut': 'close',
  'shuts': 'closes',
  'shutting': 'closing',
  'modify': 'change',
  'modifies': 'changes',
  'modified': 'changed',
  'modifying': 'changing',
  'modification': 'change',
  'prior to': 'before',
  'subsequent to': 'after',
  'in order to': 'to',
  'in the event that': 'if',
  'in the event of': 'if there is',
  'as well as': 'and',
  'adequate': 'sufficient (or give exact value)',
  'adequately': 'sufficiently',
  'properly': 'correctly (or give exact instruction)',
  'etc': 'list all items (do not use etc.)',
  'etc.': 'list all items (do not use etc.)',
  'and/or': 'use "and" or "or" explicitly',
  'shall': 'must (or use imperative)',
  'should': 'must (or explain optional choice)',
  'ought to': 'must',
  'could': 'can',
  'might': 'can (or state condition)',
  'accomplish': 'do / complete',
  'accomplishes': 'does / completes',
  'accomplished': 'done / completed',
  'obtain': 'get',
  'obtains': 'gets',
  'obtained': 'got',
  'obtaining': 'getting',
  'fabricate': 'make',
  'fabricates': 'makes',
  'fabricated': 'made',
  'approximately': 'about',
  'subsequently': 'then / after that',
  'eliminate': 'remove',
  'eliminates': 'removes',
  'eliminated': 'removed',
  'eliminating': 'removing',
  'execute': 'do / run / start',
  'executes': 'does / runs / starts',
  'executed': 'done / ran / started',
  'transmit': 'send',
  'transmits': 'sends',
  'transmitted': 'sent',
  'transmitting': 'sending',
  'verify': 'make sure / check',
  'verifies': 'makes sure / checks',
  'verified': 'made sure / checked',
  'inspect': 'examine / look at',
  'inspects': 'examines / looks at',
  'inspected': 'examined / looked at',
  'ascertain': 'make sure / find out',
  'furthermore': 'also',
  'moreover': 'also',
  'nevertheless': 'but / however',
  'nonetheless': 'but / however',
  'in view of the fact that': 'because',
  'for the purpose of': 'to',
  'with the exception of': 'except',
  'at the present time': 'now',
  'has the capability to': 'can',
  'is able to': 'can',
  'it is recommended that': 'we recommend that (or use imperative)',
  'it is necessary to': 'you must',
  'facilitate': 'help / make easy',
  'facilitates': 'helps',
  'facilitated': 'helped',
  'hazardous': 'dangerous',
  'magnitude': 'size / value',
  'necessitate': 'need / require',
  'numerous': 'many',
  'optimum': 'best',
  'portion': 'part',
  'portions': 'parts',
  'precaution': 'safety rule',
  'preclude': 'prevent',
  'precludes': 'prevents',
  'precluded': 'prevented',
  'prescribed': 'specified',
  'proximity': 'near',
  'rectify': 'correct / repair',
  'rectifies': 'corrects / repairs',
  'rectified': 'corrected / repaired',
  'remainder': 'rest',
  'retain': 'keep',
  'retains': 'keeps',
  'retained': 'kept',
  'retaining': 'keeping',
  'supersede': 'replace',
  'supersedes': 'replaces',
  'superseded': 'replaced',
  'vicinity': 'near / area',
  'vital': 'important / necessary'
};

// Common past participles used in passive voice detection
const PASSIVE_PARTICIPLES = new Set([
  'given', 'taken', 'done', 'seen', 'made', 'written', 'executed', 'performed',
  'sent', 'received', 'found', 'installed', 'removed', 'replaced', 'adjusted',
  'checked', 'tested', 'connected', 'disconnected', 'set', 'opened', 'closed',
  'transmitted', 'processed', 'calculated', 'generated', 'modified', 'changed',
  'verified', 'examined', 'configured', 'initialized', 'stopped', 'started',
  'loaded', 'saved', 'deleted', 'created', 'updated', 'selected', 'cleaned'
]);

const BE_VERBS = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'become', 'becomes', 'became'
]);

/**
 * Split text into individual sentences.
 */
function splitSentences(text) {
  if (!text) return [];
  // Split on sentence boundaries while keeping punctuation
  const matches = text.match(/[^.!?\n]+[.!?]+(\s+|$)|[^.!?\n]+$/g);
  if (!matches) return [];
  return matches.map(s => s.trim()).filter(Boolean);
}

/**
 * Split sentence into clean tokens (words).
 */
function tokenizeWords(sentence) {
  return sentence
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Detect passive voice in a sentence.
 */
function detectPassiveVoice(words) {
  const issues = [];
  const cleanWords = words.map(w => w.replace(/[^\w-]/g, ''));
  const lower = cleanWords.map(w => w.toLowerCase());
  for (let i = 0; i < lower.length - 1; i++) {
    if (BE_VERBS.has(lower[i])) {
      // Check next word or next-next word (in case of adverb e.g. "is carefully tested")
      const nextWord = lower[i + 1];
      const nextNextWord = lower[i + 2];
      
      const isPastForm = (w) => Boolean(w && (PASSIVE_PARTICIPLES.has(w) || (w.endsWith('ed') && w.length > 3)));
      
      if (isPastForm(nextWord)) {
        issues.push({
          phrase: `${cleanWords[i]} ${cleanWords[i + 1]}`,
          index: i,
          suggestion: 'Convert to active voice (state who or what performs the action).'
        });
      } else if (nextNextWord && isPastForm(nextNextWord)) {
        issues.push({
          phrase: `${cleanWords[i]} ${cleanWords[i + 1]} ${cleanWords[i + 2]}`,
          index: i,
          suggestion: 'Convert to active voice (state who or what performs the action).'
        });
      }
    }
  }
  return issues;
}

/**
 * Check unapproved words and multi-word phrases.
 */
function detectUnapprovedWords(sentence) {
  const issues = [];
  const lowerSentence = ` ${sentence.toLowerCase()} `;
  
  // Check multi-word phrases first
  for (const [phrase, replacement] of Object.entries(UNAPPROVED_WORDS)) {
    if (phrase.includes(' ')) {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(sentence)) !== null) {
        issues.push({
          word: match[0],
          replacement,
          rule: 'Rule 1: Approved Words',
          explanation: `"${match[0]}" is unapproved in ASD-STE100. Use "${replacement}" instead.`
        });
      }
    }
  }
  
  // Check single words
  const words = tokenizeWords(sentence);
  for (const word of words) {
    const wLower = word.toLowerCase();
    if (UNAPPROVED_WORDS[wLower] && !wLower.includes(' ')) {
      issues.push({
        word,
        replacement: UNAPPROVED_WORDS[wLower],
        rule: 'Rule 1: Approved Words',
        explanation: `"${word}" is unapproved in ASD-STE100. Use "${UNAPPROVED_WORDS[wLower]}" instead.`
      });
    }
  }
  
  return issues;
}

/**
 * Detect excessive noun clusters (4 or more nouns without prepositions).
 * Simplified heuristic checking consecutive capitalized or noun-like words.
 */
function detectNounClusters(words) {
  const issues = [];
  // Exclude common grammatical function words
  const nonNouns = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from',
    'and', 'or', 'but', 'is', 'are', 'was', 'were', 'will', 'must', 'can',
    'if', 'when', 'that', 'which', 'this', 'these', 'those', 'it', 'its', 'they'
  ]);
  
  let currentCluster = [];
  for (const word of words) {
    const clean = word.toLowerCase();
    if (!nonNouns.has(clean) && clean.length > 1 && !/^\d+$/.test(clean)) {
      currentCluster.push(word);
    } else {
      if (currentCluster.length >= 4) {
        issues.push({
          cluster: currentCluster.join(' '),
          length: currentCluster.length,
          rule: 'Rule 2.1: Noun Clusters',
          suggestion: `Noun cluster has ${currentCluster.length} words (max allowed is 3). Insert prepositions (e.g. "of", "for") to separate.`
        });
      }
      currentCluster = [];
    }
  }
  if (currentCluster.length >= 4) {
    issues.push({
      cluster: currentCluster.join(' '),
      length: currentCluster.length,
      rule: 'Rule 2.1: Noun Clusters',
      suggestion: `Noun cluster has ${currentCluster.length} words (max allowed is 3). Insert prepositions to separate.`
    });
  }
  return issues;
}

/**
 * Validate a text against ASD-STE100 guidelines.
 * 
 * @param {string} text - Input text
 * @param {object} options - { mode: 'strict' | 'pragmatic', sentenceType: 'procedural' | 'descriptive' }
 */
function validateText(text, options = {}) {
  const mode = options.mode || 'pragmatic'; // default to Karpathy's 80% pragmatic mode
  const isStrict = mode === 'strict';
  const maxWordsProcedural = isStrict ? 20 : 25;
  const maxWordsDescriptive = isStrict ? 25 : 30;

  const sentences = splitSentences(text);
  const totalSentences = sentences.length;
  let totalWords = 0;
  const sentenceReports = [];
  let totalIssues = 0;

  sentences.forEach((sentence, index) => {
    const words = tokenizeWords(sentence);
    const wordCount = words.length;
    totalWords += wordCount;
    
    // Heuristic: imperative starts often indicate procedural
    const isProcedural = /^(click|press|turn|open|close|remove|install|check|start|stop|connect|disconnect|run|set|make|do)\b/i.test(words[0] || '');
    const limit = isProcedural ? maxWordsProcedural : maxWordsDescriptive;
    
    const issues = [];
    
    // 1. Sentence length check
    if (wordCount > limit) {
      issues.push({
        type: 'SENTENCE_LENGTH',
        severity: 'warning',
        rule: 'Rule 3: Sentence Length',
        message: `Sentence has ${wordCount} words. Maximum allowed for ${isProcedural ? 'procedural' : 'descriptive'} text is ${limit} words.`,
        suggestion: 'Split into two or more short sentences.'
      });
    }
    
    // 2. Passive voice check
    const passiveIssues = detectPassiveVoice(words);
    for (const p of passiveIssues) {
      issues.push({
        type: 'PASSIVE_VOICE',
        severity: isStrict ? 'error' : 'warning',
        rule: 'Rule 4: Active Voice',
        message: `Passive construction detected: "${p.phrase}".`,
        suggestion: p.suggestion
      });
    }
    
    // 3. Unapproved words
    const unapproved = detectUnapprovedWords(sentence);
    for (const u of unapproved) {
      // In pragmatic mode, some softer words like 'should' or 'etc' might be tolerated if user asks, but standard replacements are always helpful
      issues.push({
        type: 'UNAPPROVED_WORD',
        severity: isStrict ? 'error' : 'info',
        rule: u.rule,
        message: u.explanation,
        word: u.word,
        replacement: u.replacement
      });
    }
    
    // 4. Noun clusters
    const nounClusters = detectNounClusters(words);
    for (const nc of nounClusters) {
      issues.push({
        type: 'NOUN_CLUSTER',
        severity: 'warning',
        rule: nc.rule,
        message: nc.suggestion,
        cluster: nc.cluster
      });
    }
    
    totalIssues += issues.length;
    
    sentenceReports.push({
      index: index + 1,
      text: sentence,
      wordCount,
      isProcedural,
      issues
    });
  });

  // Calculate compliance score (0 - 100)
  const penalty = totalIssues * 8;
  const score = Math.max(0, Math.min(100, Math.round(100 - (totalSentences > 0 ? (penalty / totalSentences) : 0))));

  return {
    mode,
    score,
    totalSentences,
    totalWords,
    averageWordsPerSentence: totalSentences > 0 ? +(totalWords / totalSentences).toFixed(1) : 0,
    totalIssues,
    sentences: sentenceReports
  };
}

/**
 * Generate a comprehensive prompt instruction for LLMs to generate ASD-STE100 output.
 * 
 * @param {object} config - { mode: 'strict' | 'pragmatic', targetFormat: 'text' | 'diagram' | 'html' }
 */
function buildSystemPrompt(config = {}) {
  const mode = config.mode || 'pragmatic';
  const targetFormat = config.targetFormat || 'text';

  if (mode === 'strict') {
    return `You must write all explanations in strict ASD-STE100 (Simplified Technical English, Issue 8).
Follow these exact constraints:
1. WORD CHOICE:
   - Use only approved words with their approved meanings.
   - Do NOT use: "utilize" (use "use"), "terminate" (use "stop"), "initiate" (use "start"), "modify" (use "change"), "prior to" (use "before"), "as well as" (use "and").
   - Eliminate vague words: "adequate", "properly", "etc.", "and/or".
2. SENTENCE LENGTH:
   - Maximum 20 words for procedural instructions.
   - Maximum 25 words for descriptive/explanatory sentences.
3. SENTENCE STRUCTURE & VOICE:
   - Write ONE thought per sentence.
   - Use ACTIVE VOICE only. Do NOT use passive voice (e.g. write "The server sends the request" NOT "The request is sent by the server").
   - For instructions, use the imperative mood ("Push the button", "Open the file").
4. NOUN CLUSTERS:
   - Do NOT use more than 3 consecutive nouns. Separate long noun chains using prepositions.
5. CLARITY:
   - Avoid complex clauses. Use bullet lists or tables for steps or multi-item data.`;
  }

  // Karpathy 80% Pragmatic Mode
  return `You must explain this using the "80% ASD-STE100" writing style (Simplified Technical English relaxed for high readability and technical concepts, as recommended by Andrej Karpathy).

Key constraints:
1. CLEAN, DIRECT SENTENCES:
   - Keep sentences short and punchy (target 15-22 words, absolute maximum 25 words).
   - One clear idea per sentence.
2. ACTIVE VOICE:
   - Always state who or what performs the action. Avoid passive constructions.
3. CLEAR VOCABULARY:
   - Prefer simple, unambiguous verbs ("use" instead of "utilize", "stop" instead of "terminate", "start" instead of "commence/initiate", "before" instead of "prior to").
   - Strip out fluff, filler, and bureaucratic hedges ("it should be noted that", "in order to", "etc.").
4. COGNITIVE SPEED:
   - Structure explanations so readers can scan and parse them instantly.
   - Limit noun chains to 3 words max. Break them up with prepositions.
   - Use bold lead-ins and structured bullet points for multi-step logic.
${targetFormat === 'diagram' ? '5. DIAGRAMS: Complement the text with a clear, concise Mermaid diagram.' : ''}
${targetFormat === 'html' ? '5. WEB PAGE: Format the output as a clean, responsive, interactive single-file HTML component.' : ''}`;
}

export {
  UNAPPROVED_WORDS,
  splitSentences,
  tokenizeWords,
  detectPassiveVoice,
  detectUnapprovedWords,
  detectNounClusters,
  validateText,
  buildSystemPrompt
};

export default {
  UNAPPROVED_WORDS,
  splitSentences,
  tokenizeWords,
  detectPassiveVoice,
  detectUnapprovedWords,
  detectNounClusters,
  validateText,
  buildSystemPrompt
};
