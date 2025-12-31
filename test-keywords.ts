// Test script to debug keyword discovery APIs
// Run with: node --loader tsx test-keywords.ts

async function testGoogleSuggest() {
    console.log('\n=== Testing Google Suggest ===');
    try {
        const query = 'anxiety coloring pages';
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✓ Google Suggest working');
        console.log('Sample results:', data[1]?.slice(0, 3));
        return true;
    } catch (error) {
        console.error('✗ Google Suggest FAILED:', error);
        return false;
    }
}

async function testDatamuse() {
    console.log('\n=== Testing Datamuse ===');
    try {
        const seed = 'anxiety';
        const url = `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(seed)}&max=10`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✓ Datamuse working');
        console.log('Sample results:', data.slice(0, 3).map((w: any) => w.word));
        return true;
    } catch (error) {
        console.error('✗ Datamuse FAILED:', error);
        return false;
    }
}

async function testReddit() {
    console.log('\n=== Testing Reddit ===');
    try {
        const subreddit = 'Coloring';
        const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'HuePress/1.0' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✓ Reddit working');
        console.log('Sample titles:', data.data.children.slice(0, 3).map((p: any) => p.data.title));
        return true;
    } catch (error) {
        console.error('✗ Reddit FAILED:', error);
        return false;
    }
}

async function testOpenAI() {
    console.log('\n=== Testing OpenAI ===');
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            console.error('✗ OPENAI_API_KEY not set in environment');
            return false;
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Say "OK" if you can read this.' }],
                max_tokens: 10
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✓ OpenAI working');
        console.log('Response:', data.choices[0]?.message?.content);
        return true;
    } catch (error) {
        console.error('✗ OpenAI FAILED:', error);
        return false;
    }
}

async function testKeywordExpansion() {
    console.log('\n=== Testing Full Keyword Expansion Flow ===');
    try {
        const keywords = ['anxiety coloring pages', 'mandala coloring'];
        const redditTrends = ['Beautiful mandala page', 'Relaxing anxiety coloring'];
        
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('✗ Skipping - OPENAI_API_KEY not set');
            return false;
        }
        
        const prompt = `You are a keyword research expert for a coloring pages website. 

Seed topic: "anxiety"
Discovered keywords: ${keywords.join(', ')}

Current Reddit trends: ${redditTrends.join(', ')}

Task:
1. Score each discovered keyword (0-10)
2. Generate 5 NEW related keywords

Return ONLY valid JSON (no markdown):
{
  "scored": [{"keyword": "...", "score": 8}],
  "generated": ["new keyword 1", "new keyword 2"]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';
        console.log('Raw AI response:', content);
        
        // Try to parse
        const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleanJson);
        
        console.log('✓ Full expansion working');
        console.log('Scored:', result.scored?.length || 0, 'keywords');
        console.log('Generated:', result.generated?.length || 0, 'new keywords');
        return true;
    } catch (error) {
        console.error('✗ Full expansion FAILED:', error);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Testing Keyword Discovery APIs\n');
    console.log('Environment:', {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'
    });
    
    const results = {
        google: await testGoogleSuggest(),
        datamuse: await testDatamuse(),
        reddit: await testReddit(),
        openai: await testOpenAI(),
        expansion: await testKeywordExpansion()
    };
    
    console.log('\n=== SUMMARY ===');
    Object.entries(results).forEach(([name, passed]) => {
        console.log(`${passed ? '✓' : '✗'} ${name.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const allPassed = Object.values(results).every(r => r);
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed - check errors above'}`);
}

runAllTests().catch(console.error);
