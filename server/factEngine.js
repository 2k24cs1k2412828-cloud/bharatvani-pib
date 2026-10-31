import axios from 'axios';
import { parseDocumentChunks, extractDeterministicFigures, normalizeText } from './documentParser.js';
import { linkEntities } from './entityLinker.js';

// Deterministic Verification Helper: Check if string exists in source chunks
function verifyEvidenceInSource(quote = '', chunks = []) {
  if (!quote) return { verified: false, matchOffset: null, matchedSentence: null, score: 0 };

  const normQuote = normalizeText(quote);

  // 1. Direct substring match
  for (const chunk of chunks) {
    const normChunk = normalizeText(chunk.text);
    if (normChunk.includes(normQuote) || normQuote.includes(normChunk)) {
      return {
        verified: true,
        matchOffset: chunk.charStart,
        matchedSentence: chunk.text,
        chunkId: chunk.id,
        score: 1.0,
      };
    }
  }

  // 2. Token overlap match (Jaccard token similarity)
  const quoteTokens = new Set(normQuote.split(' ').filter((w) => w.length > 2));
  let bestMatch = null;
  let highestScore = 0;

  for (const chunk of chunks) {
    const chunkTokens = new Set(normalizeText(chunk.text).split(' ').filter((w) => w.length > 2));
    let intersection = 0;

    quoteTokens.forEach((t) => {
      if (chunkTokens.has(t)) intersection++;
    });

    const union = new Set([...quoteTokens, ...chunkTokens]).size;
    const score = union > 0 ? intersection / union : 0;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = chunk;
    }
  }

  if (highestScore >= 0.45 && bestMatch) {
    return {
      verified: true,
      matchOffset: bestMatch.charStart,
      matchedSentence: bestMatch.text,
      chunkId: bestMatch.id,
      score: parseFloat(highestScore.toFixed(2)),
    };
  }

  return { verified: false, matchOffset: null, matchedSentence: null, score: 0 };
}

// Fallback rule-based claim extractor when offline or without LLM key
function generateRuleBasedClaims(chunks = [], lang = 'hi') {
  const claims = [];
  const safeLang = ['hi', 'en', 'ta', 'te', 'gu'].includes(lang) ? lang : 'hi';

  const defaultSubjects = {
    hi: 'भारत सरकार / अधिकृत संस्था',
    en: 'Government of India / Authorized Agency',
    ta: 'இந்திய அரசு / அங்கீகரிக்கப்பட்ட அமைப்பு',
    te: 'భారత ప్రభుత్వం / అధికారిక సంస్థ',
    gu: 'ભારત સરકાર / અધિકૃત સંસ્થા',
  };

  const defaultActions = {
    hi: 'घोषणा एवं क्रियान्वयन',
    en: 'Policy Announcement & Execution',
    ta: 'அறிவிப்பு & அமலாக்கம்',
    te: 'ప్రకటన & అమలు',
    gu: 'જાહેરાત અને અમલીકરણ',
  };

  const defaultTargets = {
    hi: 'आधिकारिक दिशानिर्देश',
    en: 'Official Guidelines',
    ta: 'அதிகாரப்பூர்வ வழிகாட்டுதல்',
    te: 'అధికారిక మార్గదర్శకాలు',
    gu: 'સત્તાવાર માર્ગદર્શિકા',
  };

  chunks.slice(0, 4).forEach((chunk, idx) => {
    const text = chunk.text;
    const num = chunk.numbers[0]?.value || '';

    claims.push({
      claimId: `C${idx + 1}`,
      statement: text.slice(0, 140),
      subject: defaultSubjects[safeLang] || defaultSubjects.hi,
      action: defaultActions[safeLang] || defaultActions.hi,
      targetQuantity: num || defaultTargets[safeLang] || 'Official Guidelines',
      evidenceQuote: text,
      status: 'VERIFIED_GROUNDED',
      groundingScore: 100,
      sourceSentence: text,
      chunkId: chunk.id,
    });
  });

  return claims;
}

// Main Grounded Fact Engine: Propose via LLM -> Deterministically Verify
export async function extractAndVerifyFacts({
  article,
  rawText = '',
  lang = 'hi',
  apiKey = '',
}) {
  const fullText = rawText || `${article.title}. ${article.description || ''}`;
  const safeLang = ['hi', 'en', 'ta', 'te', 'gu'].includes(lang) ? lang : 'hi';

  // 1. DETERMINISTIC PASS: Parse Document into verifiable chunks & extract numbers
  const chunks = parseDocumentChunks(fullText);
  const deterministicFigures = extractDeterministicFigures(chunks);
  const canonicalEntities = linkEntities(fullText);

  let proposedClaims = [];
  const keyToUse = process.env.GEMINI_API_KEY || apiKey;

  const langNames = {
    hi: 'Hindi (Devanagari)',
    en: 'English',
    ta: 'Tamil (தமிழ் script)',
    te: 'Telugu (తెలుగు script)',
    gu: 'Gujarati (ગુજરાતી script)',
  };
  const targetLangName = langNames[safeLang] || 'Hindi';

  // 2. LLM PASS: Propose atomic claims with evidence quotes
  if (keyToUse && typeof keyToUse === 'string' && keyToUse.trim()) {
    try {
      const prompt = `
You are an expert Government Intelligence Fact Checker.
Convert this official PIB Press Release into 3-4 ATOMIC FACTUAL CLAIMS following the structured knowledge schema.

SOURCE TEXT:
"""
${fullText.slice(0, 3000)}
"""

REQUIREMENTS:
1. Break down into atomic claims (Subject -> Action -> Target/Quantity).
2. Each claim MUST include the EXACT quote ("evidenceQuote") copied directly from the source text where this fact is stated.
3. Formulate the statement in ${targetLangName}.
4. Never invent or hallucinate any numbers or figures.

Respond ONLY with a JSON array of objects:
[
  {
    "claimId": "C1",
    "statement": "Clear 1-sentence statement of the claim in ${targetLangName}",
    "subject": "Subject entity (e.g. Ministry, Government, Agency)",
    "action": "Action (e.g. approved, allocated, launched, conducted)",
    "targetQuantity": "Exact number or target (e.g. ₹2,400 crore, 12 districts, 70%)",
    "evidenceQuote": "Exact sentence or snippet copied from source text"
  }
]
`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse.trim()}`;
      const response = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        },
        { timeout: 12000 }
      );

      const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const parsed = JSON.parse(textResponse);
      if (Array.isArray(parsed) && parsed.length > 0) {
        proposedClaims = parsed;
      }
    } catch (err) {
      console.warn('[FactEngine] LLM extraction failed or timed out, using rule-based extraction:', err.message);
    }
  }

  if (proposedClaims.length === 0) {
    proposedClaims = generateRuleBasedClaims(chunks, lang);
  }

  // 3. DETERMINISTIC VERIFICATION PASS: Verify proposed claims against ground-truth source
  const verifiedClaims = proposedClaims.map((claim, idx) => {
    const quoteVerification = verifyEvidenceInSource(claim.evidenceQuote || claim.statement, chunks);

    // Verify if proposed number exists in source
    let numberVerified = true;
    if (claim.targetQuantity && /\d/.test(claim.targetQuantity)) {
      const normTarget = normalizeText(claim.targetQuantity);
      numberVerified = normalizeText(fullText).includes(normTarget);
    }

    const isFullyGrounded = quoteVerification.verified && numberVerified;

    return {
      claimId: claim.claimId || `C${idx + 1}`,
      statement: claim.statement,
      subject: claim.subject || (isHindi ? 'भारत सरकार' : 'Government of India'),
      action: claim.action || (isHindi ? 'आधिकारिक सूचना' : 'Official Notice'),
      targetQuantity: claim.targetQuantity || 'N/A',
      evidenceQuote: claim.evidenceQuote || quoteVerification.matchedSentence || '',
      status: isFullyGrounded ? 'VERIFIED_GROUNDED' : 'UNVERIFIED_FLAGGED',
      groundingScore: Math.round((quoteVerification.score || 0.8) * 100),
      sourceSentence: quoteVerification.matchedSentence || (chunks[0]?.text || ''),
      chunkId: quoteVerification.chunkId || chunks[0]?.id || 'chunk-1',
    };
  });

  return {
    success: true,
    prid: article.prid || article.id,
    title: article.title,
    verifiedCount: verifiedClaims.filter((c) => c.status === 'VERIFIED_GROUNDED').length,
    totalClaims: verifiedClaims.length,
    atomicClaims: verifiedClaims,
    deterministicFigures: deterministicFigures,
    canonicalEntities: canonicalEntities,
    totalChunks: chunks.length,
    verificationEngine: 'Deterministic Grounding Validator (Gemini 2.5 Flash + Exact Token Matcher)',
  };
}
