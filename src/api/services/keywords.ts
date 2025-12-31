

export interface KeywordSuggestion {
  keyword: string;
  score: number;
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
export async function discoverKeywords(seed: string, env?: { OPENAI_API_KEY?: string }): Promise<{ results: KeywordSuggestion[] }> {
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

    const rawKeywords = Array.from(suggestions);

    // Try enhanced AI discovery, fallback to basic if it fails
    try {
        // C. Fetch Reddit Trends
        const redditTrends = await getRedditTrends();

        // D. AI Expansion & Scoring with Reddit context
        const enhancedResults = await expandAndScoreWithAI(seed, rawKeywords, redditTrends, env);
        return { results: enhancedResults };
    } catch (error) {
        console.error('AI expansion failed, returning basic keywords:', error);
        // Fallback: return discovered keywords without AI enhancement
        return {
            results: rawKeywords.map(k => ({
                keyword: k,
                source: 'google' as const,
                score: 1.0
            }))
        };
    }
}

// Fetch trending topics from Reddit coloring communities
async function getRedditTrends(): Promise<string[]> {
    try {
        const subreddits = ['Coloring', 'adultcoloring', 'coloringbooks'];
        const trends: string[] = [];

        for (const subreddit of subreddits) {
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
                headers: {
                    'User-Agent': 'HuePress/1.0'
                }
            });

            if (!response.ok) continue;

            const data = await response.json() as {
                data: {
                    children: Array<{
                        data: {
                            title: string;
                            selftext?: string;
                        }
                    }>
                }
            };

            // Extract titles and clean them
            data.data.children.forEach(post => {
                const title = post.data.title.toLowerCase();
                // Look for coloring-related terms
                if (title.includes('coloring') || title.includes('colouring')) {
                    trends.push(post.data.title);
                }
            });
        }

        return trends.slice(0, 15); // Return top 15 trending posts
    } catch (error) {
        console.error('Reddit fetch failed:', error);
        return [];
    }
}

// AI-Powered Keyword Expansion & Scoring
async function expandAndScoreWithAI(
    seed: string, 
    discoveredKeywords: string[],
    redditTrends: string[],
    env?: { OPENAI_API_KEY?: string }
): Promise<KeywordSuggestion[]> {
    const OPENAI_API_KEY = env?.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        console.warn('No OpenAI API key - skipping AI enhancement');
        // Fallback: return discovered keywords as-is
        return discoveredKeywords.map(k => ({
            keyword: k,
            score: 1.0
        }));
    }

    const prompt = `You are a keyword research expert for a coloring pages website. 

Seed topic: "${seed}"
Discovered keywords: ${discoveredKeywords.slice(0, 20).join(', ')}

${redditTrends.length > 0 ? `Current Reddit trends from r/Coloring communities:
${redditTrends.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Use these trends to inform your keyword suggestions - they represent real current interest.
` : ''}

Task:
1. Score each discovered keyword (0-10) for coloring pages relevance and search potential
2. Generate 30 NEW related keyword variations that would make great coloring page landing pages

Requirements for new keywords:
- Must be specific and descriptive (3-6 words ideal)
- Focus on themes, occasions, styles, age groups, difficulty levels
- Consider Reddit trends if they align with the seed topic
- Examples: "easy floral mandala coloring pages", "dinosaur coloring pages for toddlers"
- Avoid generic terms, therapy/medical, art supplies, or software

Return ONLY valid JSON (no markdown):
{
  "scored": [{"keyword": "...", "score": 8}],
  "generated": ["new keyword 1", "new keyword 2", ...]
}`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json() as {
            choices: { message: { content: string } }[];
        };

        const content = data.choices[0]?.message?.content || '{}';
        // Remove markdown code blocks if present
        const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleanJson) as {
            scored: { keyword: string; score: number }[];
            generated: string[];
        };

        // Combine scored + generated keywords
        const allKeywords: KeywordSuggestion[] = [
            // High-scoring discovered keywords (>= 6)
            ...result.scored
                .filter(k => k.score >= 6)
                .map(k => ({
                    keyword: k.keyword,
                    score: k.score / 10 // Normalize to 0-1
                })),
            // AI-generated keywords (default score 0.9)
            ...result.generated.map(k => ({
                keyword: k,
                score: 0.9
            }))
        ];

        // Deduplicate and sort by score
        const uniqueKeywords = new Map<string, KeywordSuggestion>();
        allKeywords.forEach(k => {
            const existing = uniqueKeywords.get(k.keyword.toLowerCase());
            if (!existing || k.score > existing.score) {
                uniqueKeywords.set(k.keyword.toLowerCase(), k);
            }
        });

        return Array.from(uniqueKeywords.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 50); // Return top 50

    } catch (error) {
        console.error('AI expansion failed:', error);
        // Fallback to original keywords
        return discoveredKeywords.map(k => ({
            keyword: k,
            score: 1.0
        }));
    }
}

