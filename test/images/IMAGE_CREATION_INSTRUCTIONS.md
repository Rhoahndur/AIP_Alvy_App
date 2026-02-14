# Test Label Image Creation Instructions

This document specifies how to create the 9 test label images needed for the verification pipeline. Each image simulates a real alcohol beverage label that will be processed by OCR.

**Output directory:** Place all completed images in `test/images/` (this directory).

**Format:** PNG, 800x1200px, RGB color mode.

---

## Standard Government Warning Text

Use this exact text wherever the government warning appears. "GOVERNMENT WARNING" must be **bold** and **ALL CAPS**. The rest of the text must NOT be bold.

```
GOVERNMENT WARNING: (1) According to the Surgeon General, women should not
drink alcoholic beverages during pregnancy because of the risk of birth
defects. (2) Consumption of alcoholic beverages impairs your ability to drive
a car or operate machinery, and may cause health problems.
```

---

## General Layout Guidelines

- Each label should look like a realistic alcohol beverage label
- Use clean, readable fonts:
  - **Brand name:** Large serif or display font, prominently positioned (top area)
  - **Class/type:** Medium serif font, below brand name
  - **Regulatory text:** Small sans-serif font (10-12pt equivalent)
  - **Government warning:** Separate section, typically at the bottom, distinct from other text
- Include all required fields as readable text on the label
- The label background can be a simple colored rectangle with a subtle texture or gradient

---

## Per-Image Specifications

### S1 — Spirits, Clean Pass
**Filename:** `S1_bourbon_clean.png`

**Label content (all must be visible and readable):**
- Brand: **OLD TOM DISTILLERY** (large, prominent, top of label)
- Class/Type: **Kentucky Straight Bourbon Whiskey**
- ABV: **45% Alc./Vol. (90 Proof)**
- Net Contents: **750 mL**
- Name & Address: **Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202**
- Government Warning: (standard text, see above)
- No country of origin (domestic product)

**Style:** Classic bourbon label aesthetic. Gold/amber tones on dark background. Clean, well-lit appearance.

**Degradation:** None — clean, straight-on, well-lit.

---

### S2 — Spirits, Clear Failures
**Filename:** `S2_bourbon_fail.png`

**Label content (note the intentional errors):**
- Brand: **OLD TOM DISTILLERY**
- Class/Type: **Kentucky Straight Bourbon Whiskey**
- ABV: **40% Alc./Vol. (80 Proof)** ← WRONG (application says 45%/90 Proof)
- Net Contents: **750 mL**
- Name & Address: **Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202**
- Government Warning: **Government Warning:** ← WRONG (title case, not ALL CAPS)
  - Rest of warning text is correct, but the heading is in title case
- No country of origin

**Style:** Same bourbon aesthetic as S1.

**Degradation:** None — clean image, the errors are in the content.

---

### S3 — Spirits, Pass After Preprocessing
**Filename:** `S3_bourbon_degraded.png`

**Label content:** Identical to S1 (all fields correct).

**Style:** Same bourbon aesthetic as S1.

**Degradation (apply all of these):**
- Reduce contrast to ~60% (darken highlights, lighten shadows)
- Rotate 5-10 degrees clockwise
- Apply Gaussian blur (radius 1-2px)
- The text should still be readable by a human but challenging for raw OCR without preprocessing

---

### W1 — Wine, Clean Pass
**Filename:** `W1_wine_clean.png`

**Label content:**
- Brand: **WILLAMETTE RESERVE** (elegant, large)
- Class/Type: **Pinot Noir**
- ABV: **13.5% Alc./Vol.**
- Net Contents: **750 mL**
- Name & Address: **Willamette Reserve Winery, 567 Vine Road, Dundee, OR 97115**
- Government Warning: (standard text)
- No country of origin (domestic)
- Appellation: **Willamette Valley** (prominently placed)
- Varietal: **Pinot Noir** (can overlap with class/type, that's fine)
- Vintage: **2021** (prominently placed, often near the top)

**Style:** Elegant wine label. Cream/burgundy tones. Minimalist design.

**Degradation:** None — clean.

---

### W2 — Wine, Missing Appellation + Wrong Vintage
**Filename:** `W2_wine_fail.png`

**Label content (note the intentional errors):**
- Brand: **WILLAMETTE RESERVE**
- Class/Type: **Pinot Noir**
- ABV: **13.5% Alc./Vol.**
- Net Contents: **750 mL**
- Name & Address: **Willamette Reserve Winery, 567 Vine Road, Dundee, OR 97115**
- Government Warning: (standard text)
- No country of origin
- Appellation: **OMIT ENTIRELY** ← NOT_FOUND (application expects "Willamette Valley")
- Varietal: **Pinot Noir**
- Vintage: **2019** ← WRONG (application says 2021)

**Style:** Same wine aesthetic as W1.

**Degradation:** None — clean image, errors are in content.

---

### W3 — Wine, Pass After Preprocessing
**Filename:** `W3_wine_degraded.png`

**Label content:** Identical to W1 (all fields correct, including appellation and vintage 2021).

**Style:** Same wine aesthetic as W1.

**Degradation (apply all of these):**
- Increase brightness by ~40% (overexposed/washed out)
- Add a white/light glare spot overlay (semi-transparent ellipse in one area)
- Slight color wash (reduce saturation slightly)
- Text should still be readable after contrast/sharpness enhancement

---

### M1 — Malt Beverage (Beer), Clean Pass
**Filename:** `M1_beer_clean.png`

**Label content:**
- Brand: **STONE'S THROW BREWING** (bold, all caps)
- Class/Type: **India Pale Ale**
- ABV: **6.8% Alc./Vol.**
- Net Contents: **12 FL OZ**
- Name & Address: **Stone's Throw Brewing Co., 890 Hop Street, Portland, OR 97209**
- Government Warning: (standard text)
- No country of origin
- No appellation, varietal, or vintage (beer)

**Style:** Craft beer can/label aesthetic. Bold, colorful design. Hops or mountain imagery welcome.

**Degradation:** None — clean.

---

### M2 — Malt Beverage, Fuzzy Match Brand + Missing Warning
**Filename:** `M2_beer_fail.png`

**Label content (note the intentional differences):**
- Brand: **STONE'S THROW BREWING** (all caps on label — the application has mixed case "Stone's Throw Brewing", so this tests fuzzy matching → should be PARTIAL match with high confidence)
- Class/Type: **India Pale Ale**
- ABV: **6.8% Alc./Vol.**
- Net Contents: **12 FL OZ**
- Name & Address: **Stone's Throw Brewing Co., 890 Hop Street, Portland, OR 97209**
- Government Warning: **COMPLETELY ABSENT** ← Do NOT include any government warning text on this label
- No country of origin

**Style:** Same beer aesthetic as M1.

**Degradation:** None — clean image, the "errors" are the missing warning and the case difference.

---

### M3 — Malt Beverage, Pass After Preprocessing
**Filename:** `M3_beer_degraded.png`

**Label content:** Identical to M1 (all fields correct, brand in all caps).

**Style:** Same beer aesthetic as M1.

**Degradation (apply all of these):**
- Rotate 15 degrees
- Apply perspective skew (slight trapezoid distortion)
- Slight barrel distortion
- Text should still be readable after deskew + contrast preprocessing

---

## Summary Table

| Image | Type | Content | Degradation | Expected Outcome |
|-------|------|---------|-------------|------------------|
| S1 | Bourbon 750mL | All correct | None | ALL MATCH |
| S2 | Bourbon 750mL | Wrong ABV + title case warning | None | ABV: MISMATCH, Warning: MISMATCH |
| S3 | Bourbon 750mL | All correct | Low contrast, rotated, blurred | ALL MATCH |
| W1 | Pinot Noir 750mL | All correct (incl. appellation, varietal, vintage) | None | ALL MATCH |
| W2 | Pinot Noir 750mL | Missing appellation, wrong vintage | None | Appellation: NOT_FOUND, Vintage: MISMATCH |
| W3 | Pinot Noir 750mL | All correct | Overexposed, glare | ALL MATCH |
| M1 | IPA 12oz | All correct | None | ALL MATCH |
| M2 | IPA 12oz | Brand case diff, warning missing | None | Brand: PARTIAL, Warning: NOT_FOUND |
| M3 | IPA 12oz | All correct | Rotated, skewed | ALL MATCH |

## Tools You Can Use

Any of these approaches will work:
- **Image editor** (Photoshop, GIMP, Figma, Canva) — create label designs manually
- **HTML/CSS → screenshot** — design labels as HTML pages, screenshot at 800x1200
- **AI image generation** — use an image generation tool with careful prompts (verify text accuracy manually!)
- **Programmatic** (sharp, canvas, Pillow) — generate labels with code

The most important thing is that **all text on the label is clearly readable by OCR**. Fancy designs are nice but readability is critical.
