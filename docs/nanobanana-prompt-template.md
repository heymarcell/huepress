# HuePress NanoBanana Pro Prompt Template

## Quick Usage

Copy the JSON block below, paste into NanoBanana Pro, and replace the `${PASTE_JSON_HERE}` placeholder at the bottom with your asset data.

---

## The Prompt (JSON Format)

```json
{
  "meta": {
    "system_identity": "HuePress Art Factory",
    "core_directive": "Generate a single BOLD & EASY coloring page image."
  },
  "visual_style_strict": {
    "line_art": {
      "color": "ABSOLUTE BLACK (#000000) on ABSOLUTE WHITE (#FFFFFF) only.",
      "stroke_weight": "Uniform 4-6pt monolinear thickness.",
      "terminations": "Round caps and round joins on ALL line endings.",
      "integrity": "Every shape path must be FULLY CLOSED (flood-fill ready). Minimum 3mm gap between lines."
    },
    "proportions": {
      "style": "Chibi: large head, compact body, stubby limbs.",
      "features": "Eyes are simple dots or ovals (no detailed irises). Faces have minimal features."
    },
    "forbidden_techniques": [
      "NO grayscale",
      "NO shading",
      "NO gradients",
      "NO hatching",
      "NO tapering lines",
      "NO sketch marks"
    ]
  },
  "composition_constraints": {
    "framing": "Subject must occupy 60-75% of the frame.",
    "white_space": "Main subject must be surrounded by significant white negative space (25-40%).",
    "placement": "Center the subject.",
    "complexity": "Single main subject with minimal supporting elements."
  },
  "format": {
    "aspect_ratio": "A4 Identifier. Use standard ISO 216 A4 dimensions. Orientation: Portrait (vertical) OR Landscape (horizontal) based on subject fit.",
    "resolution": "High definition, vector-style clarity 300DPI equivalent."
  },
  "negative_constraints_critical": {
    "NO_BORDERS": "CRITICAL: The image must NEVER have a rectangular border, frame, or outline around the canvas edges. The art must float freely.",
    "NO_CROPPING": "CRITICAL: The subject must be 100% visible. Do NOT crop heads, feet, or limbs at the canvas edge. NO overflow.",
    "NO_UNFINISHED": "No partial shapes or open paths at the edges.",
    "NO_ARTIFACTS": "No text, watermarks, signatures, or tiny details (<18mm)."
  },
  "generation_instructions": "Using the asset_data below: 1. Visualise the 'title' and 'description'. 2. Apply 'skill' level to complexity. 3. Use 'suggestedActivities' for props. 4. Output the final image adhering strictly to the visual_style_strict and negative_constraints_critical.",
  "asset_data": ${PASTE_JSON_HERE}
}
```

---

## Batch Processing Tip

When generating multiple assets, keep the structure above and simply swap the `asset_data` value. This ensures consistent style across the entire library.

## Post-Generation Workflow

1.  **Vectorize** using Vectorizer.ai or Adobe Illustrator Image Trace.
2.  **QA Check** against the visual style rules (especially closed paths and no borders).
3.  **Export** as SVG.
