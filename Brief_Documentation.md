# Label Verify: Brief Documentation

## Overview

Label Verify is a prototype web application for TTB that automates alcohol beverage label verification. It ingests application data (form or CSV), runs OCR on the label image, extracts structured fields, and compares them against expected values to produce an automated PASS/FAIL result. A manual review interface handles edge cases. Supports Spirits, Wine, and Malt Beverages.

## Approach

- **Provider pattern architecture** — OCR, ingestion, storage, and matching are each defined by a TypeScript interface with a swappable concrete implementation, keeping the pipeline decoupled from any single technology.
- **Dual-pass OCR** — Two Tesseract.js passes (one padded for character accuracy, one unpadded for faint text recovery) are merged to maximize extraction quality. Runs under 1 second per image.
- **Heuristic field parsing with reverse lookup** — A regex/pattern-based parser extracts 10 label fields (brand name, class/type, ABV, net contents, government warning, name & address, country of origin, appellation, varietal, vintage). A reverse lookup then checks if expected values appear verbatim in the raw OCR text, overriding parser errors.
- **Multi-strategy matching** — Exact match for government warning, Levenshtein fuzzy match (95% = MATCH, 75% = PARTIAL) for text fields, numeric match with beverage-type-specific ABV tolerances.
- **Two ingestion modes** — Single application via web form, or batch via CSV + image upload with client-side pairing preview.

## Tools Used

- **ClaudeCode** - Agentic Coding assistance
- **Next.js 16** — Full-stack framework (App Router, API Routes)
- **React 19 / TypeScript 5** — UI and type safety
- **Tesseract.js 7** — OCR engine (tessdata_best LSTM model, WebAssembly)
- **Sharp** — Image preprocessing (resize, grayscale, normalize, sharpen, pad)
- **Prisma 7 + Neon PostgreSQL** — ORM and serverless database
- **Vercel Blob** — Label image storage
- **Tailwind CSS 4** — Styling (custom component library, no external UI kit)
- **Vitest** — Unit and integration testing
- **Vercel** — Deployment platform (serverless functions, edge network)

## Assumptions Made

- Government warning text is the single standard TTB warning (auto-populated if omitted from CSV)
- Only three beverage types (Spirits, Wine, Malt Beverage) with type-specific required fields per TTB COLA standards
- One label image per application; English-only labels; images are reasonably oriented and legible
- Tesseract.js provides sufficient accuracy for a prototype; LLM-based vision OCR is the production upgrade path
- Processing completes within 5 seconds per label
- No authentication, multi-tenancy, or formal audit trail (prototype scope)
- Fuzzy match thresholds and ABV tolerances are configurable approximations, not TTB-validated values
- System errs toward AUTO_FAIL with manual review rather than false passes
