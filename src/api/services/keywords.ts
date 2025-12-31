
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

    // A. Direct Google Search on Seed
    // "bold coloring pages"
    const directSuggestions = await getGoogleSuggestions(`${seed} ${baseSearch}`);
    directSuggestions.forEach(s => suggestions.add(s));

    // B. Contextual Expansion via Datamuse
    // If seed="cozy", topics=["home", "cat"]
    // Queries: "cozy home coloring pages", "cozy cat coloring pages"
    const topics = await getDatamuseRelated(seed);
    
    // Limit to top 5 topics to avoid timeout
    const topTopics = topics.slice(0, 5);
    
    for (const topic of topTopics) {
        // Construct natural phrases
        // Case 1: Seed is adj, Topic is noun -> "cozy cat coloring pages"
        const q1 = `${seed} ${topic} ${baseSearch}`;
        const s1 = await getGoogleSuggestions(q1);
        s1.slice(0, 3).forEach(s => suggestions.add(s)); // Top 3

        // Case 2: Seed is noun, Topic is adj -> "red dragon coloring pages"
        // Heuristic: swap order? Google is smart enough usually.
    }

    // Convert to object
    const results = Array.from(suggestions).map(k => ({
        keyword: k,
        source: 'google' as const,
        score: 1.0 // Placeholder
    }));

    return { results };
}
