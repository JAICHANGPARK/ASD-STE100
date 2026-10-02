/**
 * ASD-STE100 (Simplified Technical English) Rule Engine & Validator
 * 
 * Implements core checking rules based on the ASD-STE100 Standard (Issue 9, January 2025)
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
  'and/or': 'and | or (choose one)',
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
  'inspect': 'examine',
  'inspects': 'examines',
  'inspected': 'examined',
  'ascertain': 'make sure / find',
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

// Participles that usually act as adjectives after "be" ("The users are tired.")
const ADJECTIVAL_PARTICIPLES = new Set([
  'tired', 'interested', 'excited', 'pleased', 'bored', 'worried', 'surprised',
  'satisfied', 'concerned', 'involved', 'supposed', 'scared', 'confused', 'married'
]);

// Words ending in -ing that are not progressive verb forms ("The type is string.")
const NON_PROGRESSIVE_ING = new Set([
  'nothing', 'something', 'anything', 'everything', 'string', 'thing', 'ring',
  'king', 'during', 'spring', 'morning', 'evening', 'ceiling', 'building', 'missing', 'interesting'
]);

// Nouns that end in -ed ("RSS feed", "network speed")
const EED_NOUNS = new Set(['speed', 'feed', 'seed', 'need', 'breed', 'greed']);

const HAVE_VERBS =new Set(['has', 'have', 'had']);

// Abbreviations that end with a period but do not end a sentence
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'e.g', 'i.e', 'approx', 'fig'
]);

/**
 * Split text into individual sentences.
 * Decimals ("2.5") and common abbreviations ("Mr.", "e.g.") do not end a sentence.
 */
function splitSentences(text) {
  if (!text) return [];
  const sentences = [];
  for (const line of text.split(/\n+/)) {
    let current = '';
    for (const part of line.split(/(?<=[.!?])\s+/)) {
      current = current ? `${current} ${part}` : part;
      const lastWord = (current.match(/(\S+)\.$/) || [])[1];
      if (lastWord && ABBREVIATIONS.has(lastWord.toLowerCase())) continue;
      sentences.push(current);
      current = '';
    }
    if (current) sentences.push(current);
  }
  return sentences.map(s => s.trim()).filter(Boolean);
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
      
      const isPastForm = (w) => Boolean(w && !ADJECTIVAL_PARTICIPLES.has(w) &&
        (PASSIVE_PARTICIPLES.has(w) || (w.endsWith('ed') && w.length > 3)));
      
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
 * Detect verb tenses that ASD-STE100 does not permit:
 * progressive ("is running") and perfect ("has processed").
 */
function detectUnapprovedTenses(words) {
  const issues = [];
  const lower = words.map(w => w.toLowerCase());
  for (let i = 0; i < lower.length - 1; i++) {
    const next = lower[i + 1];
    if (BE_VERBS.has(lower[i]) && lower[i] !== 'being' && next.endsWith('ing') && next.length > 4 && !NON_PROGRESSIVE_ING.has(next)) {
      issues.push({ phrase: `${words[i]} ${words[i + 1]}`, tense: 'progressive', suggestion: 'Use the present simple (e.g. "is running" -> "runs").' });
    }
    if (HAVE_VERBS.has(lower[i]) && (next.endsWith('ed') || PASSIVE_PARTICIPLES.has(next) || next === 'been')) {
      issues.push({ phrase: `${words[i]} ${words[i + 1]}`, tense: 'perfect', suggestion: 'Use the past simple (e.g. "has processed" -> "processed").' });
    }
  }
  return issues;
}

// Phrasal verbs (STE 9.3) and their single-verb replacements
const PHRASAL_VERBS = [
  [/\b(set|sets|setting) up\b/gi, 'install / prepare / configure'],
  [/\b(carry|carries|carried|carrying) out\b/gi, 'do'],
  [/\b(find|finds|found|finding) out\b/gi, 'find / learn'],
  [/\b(figure|figures|figured|figuring) out\b/gi, 'find / calculate'],
  [/\b(look|looks|looked|looking) into\b/gi, 'examine'],
  [/\b(come|comes|came|coming) up with\b/gi, 'make / find'],
  [/\b(get|gets|got|getting) rid of\b/gi, 'remove'],
  [/\b(fill|fills|filled|filling) out\b/gi, 'complete'],
  [/\b(give|gives|gave|giving) up\b/gi, 'stop']
];

/**
 * Detect punctuation and style issues: semicolons (STE 8.1), contractions (STE 4.2),
 * Latin abbreviations (grammar rules) and phrasal verbs (STE 9.3).
 * Contractions and Latin abbreviations are reported in strict mode only.
 */
function detectStyleIssues(sentence, isStrict) {
  const issues = [];
  if (sentence.includes(';')) {
    issues.push({
      type: 'SEMICOLON',
      severity: isStrict ? 'error' : 'info',
      rule: 'STE 8.1: No Semicolons',
      message: 'Semicolon detected. ASD-STE100 does not permit semicolons.',
      suggestion: 'Write two sentences.'
    });
  }
  if (isStrict) {
    const contractions = sentence.match(/\b\w+(n't|'re|'ll|'ve|'d|'m)\b|\b(it|that|there|what|here)'s\b/gi) || [];
    for (const c of contractions) {
      issues.push({
        type: 'CONTRACTION',
        severity: 'warning',
        rule: 'STE 4.2: No Contractions',
        message: `Contraction detected: "${c}".`,
        suggestion: 'Write the full form (e.g. "don\'t" -> "do not").'
      });
    }
    const latin = sentence.match(/\b(e\.g|i\.e|viz|cf)\.?(?=\s|,|$)/gi) || [];
    for (const l of latin) {
      issues.push({
        type: 'LATIN_ABBREVIATION',
        severity: 'warning',
        rule: 'STE Grammar: Latin Abbreviations',
        message: `Latin abbreviation detected: "${l}".`,
        suggestion: 'Use "for example" or "that is".'
      });
    }
  }
  for (const [regex, replacement] of PHRASAL_VERBS) {
    for (const match of sentence.match(regex) || []) {
      issues.push({
        type: 'PHRASAL_VERB',
        severity: isStrict ? 'warning' : 'info',
        rule: 'STE 9.3: No Phrasal Verbs',
        message: `Phrasal verb detected: "${match}". Use "${replacement}" instead.`,
        word: match,
        replacement
      });
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
  
  // Check multi-word phrases and entries with punctuation ("and/or") first
  for (const [phrase, replacement] of Object.entries(UNAPPROVED_WORDS)) {
    if (/[^a-z]/.test(phrase)) {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(sentence)) !== null) {
        issues.push({
          word: match[0],
          replacement,
          rule: 'STE 1.1: Approved Words',
          explanation: `"${match[0]}" is unapproved in ASD-STE100. Use "${replacement}" instead.`
        });
      }
    }
  }
  
  // Check single words
  const words = tokenizeWords(sentence);
  for (const word of words) {
    const wLower = word.toLowerCase();
    if (UNAPPROVED_WORDS[wLower] && !/[^a-z]/.test(wLower)) {
      issues.push({
        word,
        replacement: UNAPPROVED_WORDS[wLower],
        rule: 'STE 1.1: Approved Words',
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
    'into', 'onto', 'over', 'under', 'up', 'down', 'out', 'off', 'about', 'through',
    'between', 'before', 'after', 'during', 'until', 'while', 'because', 'than', 'as',
    'and', 'or', 'but', 'so', 'not', 'no', 'all', 'each', 'every', 'some', 'any',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had',
    'do', 'does', 'did', 'will', 'must', 'can', 'may',
    'if', 'when', 'then', 'now', 'there', 'here', 'also', 'only', 'very',
    'that', 'which', 'who', 'this', 'these', 'those',
    'it', 'its', 'they', 'them', 'their', 'you', 'your', 'we', 'our', 'he', 'she', 'his', 'her'
  ]);

  let currentCluster = [];
  for (const word of words) {
    const clean = word.toLowerCase();
    // Adverbs ("-ly"), past-tense verbs ("-ed") and numbers also break a noun cluster
    const isPastVerb = clean.endsWith('ed') && clean.length > 4 && !EED_NOUNS.has(clean);
    if (!nonNouns.has(clean) && clean.length > 1 && !/^\d+$/.test(clean) && !clean.endsWith('ly') && !isPastVerb) {
      currentCluster.push(word);
    } else {
      if (currentCluster.length >= 4) {
        issues.push({
          cluster: currentCluster.join(' '),
          length: currentCluster.length,
          rule: 'STE 2.1: Multi-Word Nouns',
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
      rule: 'STE 2.1: Multi-Word Nouns',
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
  // Strict: 20 procedural / 25 descriptive. Pragmatic (80%): hard cap of 25 for all sentences.
  const maxWordsProcedural = isStrict ? 20 : 25;
  const maxWordsDescriptive = 25;

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
        rule: isProcedural ? 'STE 5.1: Sentence Length (Procedures)' : 'STE 6: Sentence Length (Descriptions)',
        message: `Sentence has ${wordCount} words. Maximum allowed for ${isProcedural ? 'procedural' : 'descriptive'} text is ${limit} words.`,
        suggestion: 'Split into two or more short sentences.'
      });
    }
    
    // 2. Passive voice check. STE 3.6 permits the passive in descriptive text only when the agent is unknown.
    const passiveIssues = detectPassiveVoice(words);
    const namesAgent = /\bby\b/i.test(sentence);
    for (const p of passiveIssues) {
      const permitted = !isProcedural && !namesAgent;
      issues.push({
        type: 'PASSIVE_VOICE',
        severity: permitted ? 'info' : (isStrict ? 'error' : 'warning'),
        permitted,
        rule: 'STE 3.6: Active Voice',
        message: permitted
          ? `Passive construction: "${p.phrase}". Permitted in descriptive text only if the agent is unknown.`
          : `Passive construction detected: "${p.phrase}".`,
        suggestion: p.suggestion
      });
    }

    // 2b. Punctuation, contractions, Latin abbreviations and phrasal verbs
    for (const s of detectStyleIssues(sentence, isStrict)) {
      issues.push(s);
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
    
    // 4. Verb tenses (strict mode only: pragmatic mode tolerates progressive and perfect forms)
    if (isStrict) {
      for (const t of detectUnapprovedTenses(words)) {
        issues.push({
          type: 'VERB_TENSE',
          severity: 'warning',
          rule: 'STE 3.1: Verb Forms',
          message: `Unapproved ${t.tense} tense: "${t.phrase}".`,
          suggestion: t.suggestion
        });
      }
    }

    // 5. Noun clusters
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
    
    // Permitted constructions are reported for review but do not lower the score
    totalIssues += issues.filter(i => !i.permitted).length;
    
    sentenceReports.push({
      index: index + 1,
      text: sentence,
      wordCount,
      isProcedural,
      issues
    });
  });

  // Paragraph length (Section 6): one topic and maximum 6 sentences per paragraph
  let offset = 0;
  for (const paragraph of text.split(/\n\s*\n/)) {
    const count = splitSentences(paragraph).length;
    if (count > 6 && sentenceReports[offset + count - 1]) {
      sentenceReports[offset + count - 1].issues.push({
        type: 'PARAGRAPH_LENGTH',
        severity: isStrict ? 'warning' : 'info',
        rule: 'STE 6: Paragraph Length',
        message: `Paragraph has ${count} sentences. Maximum is 6 sentences per paragraph.`,
        suggestion: 'Split the paragraph. Keep one topic in each paragraph.'
      });
      totalIssues += 1;
    }
    offset += count;
  }

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
    return `You must write all explanations in strict ASD-STE100 (Simplified Technical English, Issue 9).
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
   - Use the ACTIVE VOICE (for example, write "The server sends the request" NOT "The request is sent by the server"). In descriptive text, use the passive voice only when the agent is unknown. In procedures, always use the active voice.
   - For instructions, use the imperative mood ("Push the button", "Open the file").
4. NOUN CLUSTERS:
   - Do NOT use more than 3 consecutive nouns. Separate long noun chains using prepositions.
5. VERBS:
   - Use only: infinitive, imperative, simple present, simple past, simple future ("will"), and the past participle as an adjective.
   - Do NOT use "-ing" forms (except in technical nouns), perfect tenses, or phrasal verbs ("set up", "carry out").
6. CLARITY AND PUNCTUATION:
   - Avoid complex clauses. Use bullet lists or tables for steps or multi-item data.
   - Do not omit articles or "that". Do not use contractions, semicolons, or Latin abbreviations (e.g., i.e., etc.).
   - Write a maximum of 6 sentences per paragraph, with one topic in each paragraph.
7. SAFETY:
   - For risks, write "WARNING:" or "CAUTION:", then a clear command, then a short explanation of the risk.`;
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
  detectUnapprovedTenses,
  detectStyleIssues,
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
  detectUnapprovedTenses,
  detectStyleIssues,
  validateText,
  buildSystemPrompt
};
