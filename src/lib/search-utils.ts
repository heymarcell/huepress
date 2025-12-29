
/**
 * Search Utilities for HuePress
 * Handles query expansion, synonyms, and sanitization for FTS5
 */

// Synonyms map - simple expansion for common coloring page terms
// Keys are lowercased. Values are arrays of synonyms.
const SYNONYMS: Record<string, string[]> = {
  // Animals
  "dog": ["puppy", "canine", "doggy"],
  "puppy": ["dog", "canine"],
  "cat": ["kitten", "feline", "kitty"],
  "kitten": ["cat", "feline"],
  "rabbit": ["bunny", "hare"],
  "bunny": ["rabbit"],
  "bear": ["teddy"],
  "teddy": ["bear"],
  "mouse": ["mice", "rat"],
  "bird": ["avian"],
  "fish": ["marine"],
  "horse": ["pony", "stallion"],
  "pony": ["horse"],
  
  // Vehicles
  "car": ["auto", "vehicle", "automobile", "truck"],
  "truck": ["car", "vehicle"],
  "plane": ["airplane", "aircraft", "jet"],
  "airplane": ["plane", "aircraft", "jet"],
  "boat": ["ship", "vessel", "yacht"],
  "ship": ["boat", "vessel"],
  "train": ["locomotive", "railway"],
  
  // Themes
  "space": ["galaxy", "universe", "star", "planet", "astronaut"],
  "fantasy": ["magic", "mythical"],
  "princess": ["royal", "queen"],
  "fairy": ["pixie", "fae"],
  "robot": ["android", "bot", "auto"],
  "dinosaur": ["dino", "t-rex", "jurassic"],
  "dino": ["dinosaur", "t-rex"],
  
  // Holidays & Occasions
  "christmas": ["xmas", "holiday", "santa"],
  "halloween": ["spooky", "pumpkin"],
  "easter": ["spring"],
  "birthday": ["party", "celebration", "cake"],
  
  // Styles/Nature
  "flower": ["floral", "bloom", "blossom", "plant"],
  "tree": ["forest", "nature"],
  "ocean": ["sea", "beach", "marine", "underwater"],
  "cute": ["kawaii", "adorable", "sweet"],
  "simple": ["easy", "basic", "beginner"],
  "pattern": ["mandala", "geometric", "abstract"],
};

/**
 * Expands a user search query into a robust FTS5 MATCH query string.
 * - Splits query into terms
 * - Finds synonyms for each term
 * - Constructs groups: ("term"* OR "synonym1"* OR "synonym2"*)
 * - Joins groups with AND logic
 * 
 * @param query Raw user input
 * @returns FTS5 query string or null if empty
 */
export function expandQuery(query: string): string | null {
  if (!query) return null;

  // 1. Sanitize: Remove non-alphanumeric chars (except spaces) to prevent FTS5 syntax errors
  const sanitized = query.replace(/[^\w\s]/g, '').toLowerCase().trim();
  
  if (!sanitized) return null;

  // 2. Split into terms
  const terms = sanitized.split(/\s+/).filter(Boolean);
  
  if (terms.length === 0) return null;

  // 3. Build query groups
  const groups = terms.map(term => {
    // Start with the term itself (quoted + prefix wildcard)
    const options = [`"${term}"*`];
    
    // exact match for the term itself (optional, but prefix covers it)
    // options.push(`"${term}"`);
    
    // Add Synonyms
    const syns = SYNONYMS[term];
    if (syns) {
      syns.forEach(s => options.push(`"${s}"*`));
    }
    
    // Join options with OR
    if (options.length > 1) {
      return `(${options.join(" OR ")})`;
    } else {
      return options[0];
    }
  });

  // 4. Join groups with AND (space in FTS5 implies AND)
  return groups.join(" ");
}
