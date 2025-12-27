const { generateOgBuffer } = require('./lib/generators');
const fs = require('fs');

async function testWrapping() {
    const titles = [
        "Build Your Own Pizza Night",
        "Community Swap Shop Smiles",
        "A Very Long Title That Should Break Into Three Lines",
        "Short Title"
    ];

    console.log("Testing text wrapping...");
    
    // We can't see the internal lines array directly as generateOgBuffer returns a buffer.
    // However, we can potentially modify generators.js temporarily to log, OR just run this to valid execution.
    // Ideally, we'd mock the split logic, but for now let's just ensure it generates without error.
    
    for (const title of titles) {
        console.log(`Generating OG for: "${title}"`);
        try {
            await generateOgBuffer('<svg></svg>', title);
            console.log(`✓ Success`);
        } catch (e) {
            console.error(`✗ Failed`, e);
        }
    }
}

testWrapping();
