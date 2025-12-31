
export interface KeywordSuggestion {
  keyword: string;
  source: 'google' | 'datamuse' | 'gpt';
  score?: number;
}

// 1. Datamuse: Get contextually related words
// rel_jja = Nouns modified by the adjective (e.g. "cozy" -> "home", "cat")
// rel_jjb = Adjectives describing a noun (e.g. "flower" -> "red", "wild")
// rel_trg = Triggers (associations)
export async function getDatamuseRelated(seed: string): Promise<string[]> {
  try {
    // Try to determine if seed is adj or noun? 
    // Just blindly fetch "nouns modified by this" (assuming seed is adj like "bold")
    // AND "adjectives describing this" (assuming seed is noun like "dragon")
    
    const [nounRes, adjRes, trigRes] = await Promise.all([
        fetch(`https://api.datamuse.com/words?rel_jja=${seed}&max=8`).then(r => r.json()), // If seed is 'cozy', gives 'home', 'room'
        fetch(`https://api.datamuse.com/words?rel_jjb=${seed}&max=8`).then(r => r.json()), // If seed is 'dragon', gives 'red', 'green'
        fetch(`https://api.datamuse.com/words?rel_trg=${seed}&max=5`).then(r => r.json())  // General associations
    ]);

    const words = new Set<string>();
    
    // @ts-expect-error - Datamuse response typing
    nounRes.forEach(x => words.add(x.word));
    // @ts-expect-error - Datamuse response typing
    adjRes.forEach(x => words.add(x.word));
    // @ts-expect-error - Datamuse response typing
    trigRes.forEach(x => words.add(x.word));

    return Array.from(words);
  } catch (e) {
    console.error("Datamuse error", e);
    return [];
  }
}

// 2. Google Suggest: Get real autocomplete queries
export async function getGoogleSuggestions(query: string): Promise<string[]> {
    try {
        const url = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        
        const data = await res.json() as [string, string[]];
        // response is ["query", ["result1", "result2", ...]]
        return data[1] || [];
    } catch (e) {
        console.error("Google Suggest error", e);
        return [];
    }
}

// 3. Orchestrator
export async function discoverKeywords(seed: string): Promise<{ results: KeywordSuggestion[] }> {
    const baseSearch = "coloring pages";
    const suggestions = new Set<string>();

    // Blacklist: Filter out non-coloring queries
    const blacklist = [
        // Non-English indicators
        'farben', 'malen', 'zeichnen', 'ausmalen', 'bemalen', 'spielzeug', 'tagebuch', 'diagnose', 'dorosłych', 'muster',
        // Therapy/medical (not coloring)
        'therapy', 'therapist', 'diagnosis', 'medication', 'treatment', 'doctor', 'dr ', 'symptoms',
        // Art supplies (not coloring pages)
        'painting', 'paint', 'acrylic', 'canvas', 'leinwand', 'papier', 'paper', 'supplies', 
        // Software/tools
        'illustrator', 'photoshop', 'canva', 'app', 'software',
        // Too generic
        'buy', 'shop', 'amazon', 'etsy', 'pdf download free'
    ];


    // Helper: Check if keyword is relevant
    const isRelevant = (kw: string): boolean => {
        const lower = kw.toLowerCase();
        
        // Must NOT contain blacklisted terms
        if (blacklist.some(term => lower.includes(term))) {
            return false;
        }
        
        // English check: Reject if contains non-ASCII chars (except common ones)
        if (/[äöüßąćęłńóśźżñ]/i.test(lower)) {
            return false;
        }
        
        // Minimum quality check: Should be at least 3 words (avoids too generic)
        const wordCount = lower.trim().split(/\s+/).length;
        if (wordCount < 2) {
            return false;
        }
        
        return true;
    };

    // A. Direct Google Search on Seed
    // Always include "coloring pages" to keep it focused
    const directSuggestions = await getGoogleSuggestions(`${seed} ${baseSearch}`);
    directSuggestions.filter(isRelevant).forEach(s => suggestions.add(s));

    // B. Contextual Expansion via Datamuse
    const topics = await getDatamuseRelated(seed);
    
    // Limit to top 3 topics (was 5) to reduce noise
    const topTopics = topics.slice(0, 3);
    
    for (const topic of topTopics) {
        // Always anchor with "coloring pages" or "coloring book"
        const queries = [
            `${seed} ${topic} coloring pages`,
            `${topic} coloring pages`,
        ];

        for (const q of queries) {
            const results = await getGoogleSuggestions(q);
            results.filter(isRelevant).slice(0, 2).forEach(s => suggestions.add(s));
        }
    }

    // Convert to object
    const results = Array.from(suggestions).map(k => ({
        keyword: k,
        source: 'google' as const,
        score: 1.0
    }));

    return { results };
}

