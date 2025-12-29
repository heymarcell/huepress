
/**
 * Search Utilities for HuePress
 * Handles query expansion, synonyms, and sanitization for FTS5
 */

// Synonyms map - simple expansion for common coloring page terms
// Keys are lowercased. Values are arrays of synonyms.
const SYNONYMS: Record<string, string[]> = {
  // --- ANIMALS ---
  "dog": ["puppy", "canine", "doggy", "pup", "dogs"],
  "puppy": ["dog", "canine", "pup", "puppies"],
  "cat": ["kitten", "feline", "kitty", "cats"],
  "kitten": ["cat", "feline", "kitty", "kittens"],
  "rabbit": ["bunny", "hare", "bunnies"],
  "bunny": ["rabbit", "hare"],
  "bear": ["teddy", "cub", "bears"],
  "teddy": ["bear", "stuffed"],
  "cub": ["bear", "baby"],
  "mouse": ["mice", "rat", "rodent"],
  "mice": ["mouse", "rodent"],
  "bird": ["avian", "birds", "flying"],
  "fish": ["marine", "aquatic", "fishes"],
  "horse": ["pony", "stallion", "mare", "equine"],
  "pony": ["horse"],
  "fox": ["vixen", "foxes"],
  "wolf": ["wolves", "canine"],
  "sloth": ["sloths"],
  "camel": ["dromedary", "camels"],
  "pigeon": ["dove", "bird"],
  "goat": ["kid", "billy", "goats"],
  "toucan": ["bird", "tropical"],
  "llama": ["alpaca", "llamas"],
  "bison": ["buffalo"],
  "otter": ["otters"],
  "panda": ["bear", "red-panda"],
  "penguin": ["bird", "penguins"],
  "turtle": ["tortoise", "terrapin", "sea-turtle"],
  "dinosaur": ["dino", "t-rex", "jurassic", "prehistoric", "reptile"],
  "dino": ["dinosaur", "t-rex"],
  "dragon": ["beast", "mythical", "dragons"],
  "unicorn": ["fantasy", "horse", "magic"],
  "lion": ["cat", "feline", "king"],
  "tiger": ["cat", "feline", "big-cat"],
  "elephant": ["pachyderm"],
  "monkey": ["ape", "primate", "chimp"],
  
  // --- NATURE & SCENES ---
  "flower": ["floral", "bloom", "blossom", "plant", "flowers"],
  "floral": ["flower", "bloom"],
  "tree": ["forest", "wood", "woods", "trees", "jungle"],
  "forest": ["wood", "woods", "tree", "jungle", "rainforest"],
  "ocean": ["sea", "beach", "marine", "underwater", "water", "aquatic", "tide-pool"],
  "sea": ["ocean", "beach", "marine"],
  "beach": ["sand", "sea", "ocean", "shore", "seaside"],
  "mountain": ["peak", "mount", "alp", "mountains", "landscape"],
  "river": ["stream", "creek", "water"],
  "rain": ["storm", "weather", "shower", "puddle"],
  "cloud": ["sky", "weather", "clouds"],
  "star": ["space", "sky", "astronomy", "stars"],
  "moon": ["lunar", "night", "sky", "crescent"],
  "sun": ["solar", "day", "sunny", "sunshine"],
  "snow": ["winter", "ice", "cold", "snowflake"],
  "winter": ["snow", "cold", "seasonal", "ice", "frost"],
  "spring": ["flower", "rain", "blooming", "seasonal"],
  "summer": ["sun", "beach", "hot", "seasonal"],
  "autumn": ["fall", "leaf", "leaves", "harvest", "seasonal"],
  "garden": ["plant", "flower", "yard", "backyard"],

  // --- VEHICLES & TRANSPORT ---
  "car": ["auto", "vehicle", "automobile", "cars"],
  "truck": ["lorry", "pickup", "vehicle", "trucks"],
  "plane": ["airplane", "aircraft", "jet", "fly"],
  "airplane": ["plane", "aircraft", "jet"],
  "boat": ["ship", "vessel", "yacht", "sailing"],
  "ship": ["boat", "vessel"],
  "train": ["locomotive", "railway", "engine"],
  "tram": ["streetcar", "trolley", "train"],
  "bike": ["bicycle", "cycle", "cargo-bike"],
  "bicycle": ["bike", "cycle"],
  "camper": ["van", "rv", "caravan", "camping"],
  "rocket": ["space", "ship", "shuttle"],
  "bus": ["schoolbus", "coach", "vehicle"],

  // --- FANTASY & MAGIC ---
  "fantasy": ["magic", "mythical", "imaginary"],
  "princess": ["royal", "queen", "castle"],
  "fairy": ["pixie", "fae", "sprite", "magic", "wings"],
  "sprite": ["fairy", "pixie"],
  "magic": ["spell", "wizard", "witch", "fantasy"],
  "castle": ["fortress", "palace", "royal", "tower"],
  "monster": ["creature", "beast", "alien"],
  "robot": ["android", "bot", "cyborg", "machine", "tech"],
  "alien": ["extraterrestrial", "space", "invader"],
  
  // --- FOOD & DRINK ---
  "food": ["snack", "meal", "eat", "yummy"],
  "fruit": ["berry", "apple", "banana", "citrus", "fruits"],
  "vegetable": ["veggie", "carrot", "plant"],
  "pizza": ["slice", "meal", "cheese", "pepperoni"],
  "smoothie": ["drink", "shake", "juice", "beverage"],
  "tea": ["drink", "cup", "beverage", "teapot"],
  "coffee": ["drink", "cup", "beverage", "cafe"],
  "cake": ["dessert", "sweet", "birthday", "cupcake"],
  "sweet": ["candy", "treat", "dessert", "sugar"],
  "ice-cream": ["dessert", "sweet", "scoop", "cone"],

  // --- HOLIDAYS & OCCASIONS ---
  "christmas": ["xmas", "holiday", "santa", "winter", "festive"],
  "santa": ["christmas", "claus", "nick"],
  "halloween": ["spooky", "pumpkin", "trick", "ghost", "witch"],
  "easter": ["bunny", "egg", "spring", "holiday"],
  "birthday": ["party", "celebration", "cake", "present", "gift"],
  "valentine": ["heart", "love", "friendship", "romance"],
  "new-year": ["celebration", "party", "fireworks"],
  "holiday": ["celebration", "festive", "vacation"],

  // --- STYLES & CONCEPTS ---
  "cute": ["kawaii", "adorable", "sweet", "lovely"],
  "simple": ["easy", "basic", "beginner", "minimal"],
  "pattern": ["mandala", "geometric", "abstract", "design", "texture"],
  "mandala": ["pattern", "circle", "meditative"],
  "mindful": ["relaxing", "calm", "meditative", "zen"],
  "detailed": ["intricate", "complex", "advanced", "hard"],
  "family": ["parent", "mom", "dad", "child", "grandparent"],
  "school": ["class", "learn", "study", "student"],
  "space": ["galaxy", "universe", "planet", "star", "astronaut", "cosmos"],
  "learning": ["educational", "study", "school", "stem"],
  
  // --- PLACES & ENVIRONMENTS ---
  "city": ["urban", "town", "street", "metropolis", "skyline", "buildings"],
  "farm": ["barn", "country", "rural", "animals"],
  "jungle": ["rainforest", "wild", "tropical", "amazon"],
  "desert": ["sand", "dunes", "dry", "cactus", "sahara"],
  "house": ["home", "cottage", "building", "abode"],
  "kitchen": ["cooking", "bake", "food", "room"],
  "library": ["books", "reading", "quiet", "study"],
  
  // --- OBJECTS & ACTIVITIES ---
  "bento": ["lunch", "box", "meal", "food"],
  "book": ["read", "reading", "story", "novel"],
  "music": ["song", "instrument", "melody", "guitar", "band"],
  "party": ["celebration", "birthday", "fun", "fiesta"],
  "game": ["play", "toy", "fun", "activity"],
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
