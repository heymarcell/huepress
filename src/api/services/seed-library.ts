// Curated seed words for HuePress pSEO generation
// These represent the search intent clusters our audience uses

export const SEED_LIBRARY = {
  // Core Modifiers (Adjectives)
  modifiers: [
    "bold",
    "easy",
    "simple",
    "cozy",
    "mindful",
    "therapeutic",
    "calming",
    "relaxing",
    "detailed",
    "intricate"
  ],
  
  // Mental Health & Wellness
  wellness: [
    "anxiety",
    "adhd",
    "autism",
    "stress",
    "depression",
    "therapy",
    "sensory",
    "mindfulness",
    "meditation",
    "focus"
  ],
  
  // Audience Segments
  audiences: [
    "kids",
    "adults",
    "toddlers",
    "teens",
    "seniors",
    "children",
    "beginners",
    "students"
  ],
  
  // Styles & Patterns
  styles: [
    "mandala",
    "geometric",
    "floral",
    "abstract",
    "nature",
    "animals",
    "butterfly",
    "dragon",
    "cat",
    "flower"
  ],
  
  // Seasonal & Themes
  themes: [
    "christmas",
    "halloween",
    "spring",
    "summer",
    "fall",
    "winter",
    "easter",
    "valentine"
  ],
  
  // Activities & Occasions
  occasions: [
    "classroom",
    "school",
    "home",
    "travel",
    "birthday",
    "party"
  ]
};

// Generate all seed combinations for research
export function getAllSeeds(): string[] {
  return [
    ...SEED_LIBRARY.modifiers,
    ...SEED_LIBRARY.wellness,
    ...SEED_LIBRARY.audiences,
    ...SEED_LIBRARY.styles,
    ...SEED_LIBRARY.themes,
    ...SEED_LIBRARY.occasions
  ];
}

// Priority seeds (run these first for quick wins)
export const PRIORITY_SEEDS = [
  "anxiety",
  "adhd",
  "bold",
  "easy",
  "mandala",
  "geometric",
  "kids",
  "adults"
];
