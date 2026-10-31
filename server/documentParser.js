// Document Parsing, Chunking & Token Extraction Engine

// Number & Numerical Metric Regular Expressions (Multilingual: Hindi, English, Tamil, Telugu, Gujarati)
export const NUMBER_PATTERNS = {
  // Money & Budget Allocations (₹, Rs, Crore, Lakh, கோடி, கோట్లు, કરોડ)
  money: /(?:₹|Rs\.?|INR|ரூபாய்|ரூ|రూపాయలు|రూ|રૂપિયા|રૂ)\s*[\d,]+(?:\.\d+)?\s*(?:करोड़|लाख|हजार|crore|cr|lakh|thousand|million|billion|trillion|கோடி|லட்சம்|ஆயிரம்|కోట్లు|లక్షలు|వేలు|કરોડ|લાખ|હજાર)?|[\d,]+(?:\.\d+)?\s*(?:करोड़|लाख|crore|cr|lakh|million|billion|கோடி|லட்சம்|కోట్లు|లక్షలు|કરોડ|લાખ)\s*(?:रुपये|रु|₹|rupees|inr|ரூபாய்|ரூపాయలు|રૂપિયા)?/gi,
  
  // Percentages & Rates (%, प्रतिशत, சதவீதம், శాతం, ટકા)
  percentage: /[\d,]+(?:\.\d+)?\s*(?:%|प्रतिशत|சதவீதம்|శాతం|ટકા|percent|percentage)/gi,
  
  // Quantities & Units (MW, GW, tonnes, hectares, districts, farmers, villages, centres)
  quantity: /[\d,]+(?:\.\d+)?\s*(?:टन|हेक्टेयर|मेगावाट|गीगावाट|जिले|गाँव|किसान|केंद्र|पंप|டன்கள்|ஹெக்டேர்|மெகாவாட்|விவசாயிகள்|టన్నులు|హెక్టార్లు|మెగావాట్|రైతులు|ટન|હેક્ટર|મેગાવોટ|ખેડૂતો|tonnes|tons|hectares|ha|mw|gw|districts|villages|farmers|centres|units|pumps|beneficiaries|quintal|mt)/gi,
  
  // Dates & Years (e.g. 19 August 2026, 2026-27, FY26)
  date: /\b\d{1,2}\s+(?:जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|ஜனவரி|பிப்ரவரி|மார்ச்|ஏப்ரல்|மே|ஜூன்|ஜூலை|ஆகஸ்ட்|செப்டம்பர்|அக்டோபர்|நவம்பர்|டிசம்பர்|జనవరి|ఫిబ్రవరి|మార్చి|ఏప్రిల్|మే|జూన్|జూలై|ఆగస్టు|సెప్టెంబర్|అక్టోబర్|నవంబర్|డిసెంబర్|જાન્યુઆરી|ફેબ્રુઆરી|માર્ચ|એપ્રિલ|મે|જૂન|જુલાઈ|ઓગસ્ટ|સપ્ટેમ્બર|ઓક્ટોબર|નવેમ્બર|ડિસેમ્બર)\s+\d{4}\b|\b\d{4}-\d{2,4}\b|\bFY\s*\d{2,4}\b/gi,
};

// Normalize text for strict deterministic comparison
export function normalizeText(text = '') {
  return text
    .replace(/[*#_~`]/g, '')
    .replace(/[,\s]+/g, ' ')
    .toLowerCase()
    .trim();
}

// Split raw document text into clean structured sentence chunks with offset tracking
export function parseDocumentChunks(rawText = '') {
  if (!rawText) return [];

  // Clean raw HTML or boilerplate
  const clean = rawText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\r?\n+/g, '\n')
    .trim();

  // Split into sentences (Devanagari purna viram '।' and standard periods '.')
  const rawSentences = clean.split(/(?<=[.।!?])\s+/);
  const chunks = [];
  let currentOffset = 0;

  rawSentences.forEach((sentence, index) => {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && !trimmed.startsWith('***') && !trimmed.includes('उपयोग संबंधी शर्तें')) {
      const charStart = currentOffset;
      const charEnd = currentOffset + trimmed.length;

      // Extract raw numerical tokens in this sentence
      const numbersFound = [];

      for (const [type, regex] of Object.entries(NUMBER_PATTERNS)) {
        const matches = trimmed.match(regex);
        if (matches) {
          matches.forEach((m) => {
            numbersFound.push({
              type,
              value: m.trim(),
            });
          });
        }
      }

      chunks.push({
        id: `chunk-${index + 1}`,
        index: index + 1,
        text: trimmed,
        charStart,
        charEnd,
        numbers: numbersFound,
      });

      currentOffset = charEnd + 1;
    }
  });

  return chunks;
}

// Extract all deterministic figures from document chunks
export function extractDeterministicFigures(chunks = []) {
  const figures = [];
  const seen = new Set();

  chunks.forEach((chunk) => {
    chunk.numbers.forEach((num) => {
      const key = `${num.type}_${num.value.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        figures.push({
          id: `fig-${figures.length + 1}`,
          type: num.type,
          value: num.value,
          sourceSentence: chunk.text,
          chunkId: chunk.id,
          verified: true, // Deterministically parsed from source!
        });
      }
    });
  });

  return figures;
}
