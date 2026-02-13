# Label Verify

**AI-Powered Alcohol Label Verification App** for the TTB (Alcohol and Tobacco Tax and Trade Bureau)

An automated prototype that ingests alcohol beverage label applications, performs OCR-based text extraction on label images, and compares extracted content against submitted application data — replacing the manual field-by-field matching that compliance agents currently perform by eye.

> **Live Demo:** [https://label-verify.vercel.app](https://label-verify.vercel.app) *(placeholder — update after deployment)*

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Production Scaling Path](#production-scaling-path)
- [Security & Compliance Roadmap](#security--compliance-roadmap)
- [Future Enhancements](#future-enhancements)

---

## Overview

TTB reviews ~150,000 label applications per year with 47 compliance agents. The core process is manual field-by-field matching: verifying that brand name, alcohol content, government warning, and other required fields on the physical label match the submitted application data.

This prototype automates that matching work:

1. **Submit** — Agent uploads an application (single form or CSV batch) with label image(s)
2. **Verify** — System runs OCR on the label image, parses 10 structured fields, and compares them against the application data
3. **Review** — Agent reviews per-field MATCH/MISMATCH/PARTIAL results, overrides if needed, and makes a final approve/reject decision
4. **History** — All completed verifications are browsable and filterable

### Key Features

- **Single & batch submission** — Web form for individual applications, CSV + multi-image upload for batch
- **Sub-5-second processing** — Image preprocessing + OCR + field parsing + matching in under 5 seconds per label
- **10-field verification** — 7 universal fields + 3 wine-only fields (appellation, varietal, vintage)
- **Smart matching** — Exact match for government warning, fuzzy Levenshtein matching with confidence scores for other fields, numeric tolerance for ABV and net contents
- **Manual override** — Agent can override any auto-result per field with a reason, then approve or reject the application
- **Accessible UI** — WCAG AA color contrast, keyboard navigation, ARIA labels, skip-to-content, large click targets

---

## Architecture

The application follows a modular, provider-pattern architecture. Each major concern (OCR, matching, ingestion, storage) is behind an abstract interface, enabling future upgrades without refactoring consuming code.

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js App Router)                           │
│  /submit  /queue  /application/[id]  /history            │
└────────────────────────┬─────────────────────────────────┘
                         │ API Routes
┌────────────────────────┴─────────────────────────────────┐
│  BACKEND (Next.js API Routes)                            │
│  /api/applications  /api/verify  /api/applications/[id]  │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────┴─────────────────────────────────┐
│  SERVICE LAYER                                           │
│  ┌─────────────┐ ┌──────────┐ ┌────────────────────────┐│
│  │ Ingestion   │ │ OCR      │ │ Matching Engine        ││
│  │ (CSV/Form)  │ │ (sharp + │ │ (Exact + Fuzzy +       ││
│  │             │ │ Tesseract│ │  Numeric + Confidence)  ││
│  └─────────────┘ └──────────┘ └────────────────────────┘│
│  ┌──────────┐ ┌──────────────────┐                      │
│  │ Storage  │ │ Pipeline         │                      │
│  │ (Blob)   │ │ (Orchestrator)   │                      │
│  └──────────┘ └──────────────────┘                      │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────┴─────────────────────────────────┐
│  DATA LAYER                                              │
│  Prisma ORM → Vercel Postgres (Neon)                     │
│  Vercel Blob → Image Storage                             │
└──────────────────────────────────────────────────────────┘
```

### Verification Pipeline (Per Image)

```
Image → Preprocess (sharp: grayscale, contrast, sharpen, resize)
      → OCR (Tesseract.js, pre-warmed worker)
      → Parse (regex + keyword heuristics → 10 structured fields)
      → Match (exact for gov. warning, fuzzy for rest, numeric tolerance for ABV)
      → Result (AUTO_PASS if all fields match, AUTO_FAIL if any mismatch)

Target: < 5 seconds total (hard requirement)
```

### Provider Pattern

The architecture supports swapping components without refactoring:

| Interface | MVP Provider | Future Options |
|-----------|-------------|----------------|
| `OCRProvider` | Tesseract.js + sharp | Claude Vision, GPT-4o, Azure Document Intelligence |
| `MatchingEngine` | Algorithmic (Levenshtein + regex) | LLM-based semantic comparison |
| `IngestionProvider` | CSV parser | TTB Form 5100.31 PDF/DOCX parser |
| `StorageProvider` | Vercel Blob | Azure Blob Storage (FedRAMP) |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | Fullstack React — frontend + API routes in one codebase. App Router for modern React Server Components and streaming. |
| **OCR Engine** | Tesseract.js 7 (fast model) | Free, local OCR. No API keys, no external service calls. Runs entirely within serverless functions. No network firewall issues for federal deployment. |
| **Image Preprocessing** | sharp | Native C++ bindings for sub-100ms grayscale, contrast enhancement, sharpening, and resize. Dramatically improves OCR accuracy on degraded images. |
| **Database** | Vercel Postgres (Neon) | Managed PostgreSQL with serverless driver. Free tier sufficient for prototype (256 MB). |
| **ORM** | Prisma 7 | Type-safe database queries, automatic migrations, schema-first design. Uses `@prisma/adapter-neon` for serverless connection pooling. |
| **Image Storage** | Vercel Blob | Managed object storage for uploaded label images. Returns public URLs for display. |
| **Styling** | Tailwind CSS 4 | Utility-first CSS — fast development, small bundle, consistent design system. |
| **Testing** | Vitest 4 | Fast, ESM-native test runner. Compatible with TypeScript path aliases. 77 tests covering services, integration, and performance. |
| **Deployment** | Vercel | Zero-config Next.js hosting with serverless functions, automatic HTTPS, preview deployments. |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- A **Vercel account** (for Postgres + Blob provisioning, or use local alternatives)

### 1. Clone the repository

```bash
git clone <repository-url>
cd label-verify
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database (Vercel Postgres / Neon)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxx"
```

**To provision these services:**
- **Vercel Postgres:** Create a project on [vercel.com](https://vercel.com), go to Storage > Create Database > Postgres. Copy the `DATABASE_URL` from the `.env.local` tab.
- **Vercel Blob:** In the same project, go to Storage > Create Store > Blob. Copy the `BLOB_READ_WRITE_TOKEN`.

### 4. Set up the database

Generate the Prisma client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the verification queue.

### 6. (Optional) Seed demo data

```bash
npx tsx prisma/seed.ts
```

This creates 9 sample applications (3 spirits, 3 wine, 3 malt beverage) from the test fixture data.

---

## Running Tests

The test suite includes 77 tests across unit, integration, and performance categories.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Test Structure

```
test/
  services/
    levenshtein.test.ts      # 8 tests — string distance algorithm
    exact-matcher.test.ts    # 6 tests — government warning exact match
    fuzzy-matcher.test.ts    # 8 tests — normalized fuzzy matching
    numeric-matcher.test.ts  # 11 tests — ABV tolerance, net contents, units
    matching-engine.test.ts  # 5 tests — full engine orchestration
    parser.test.ts           # 12 tests — field extraction from OCR text
    ingestion.test.ts        # 13 tests — CSV parsing, validation, batch pairing
    preprocessor.test.ts     # 6 tests — image resize, format, grayscale
  integration/
    pipeline.test.ts         # 4 tests — full OCR → parse → match pipeline
  performance/
    timing.test.ts           # 4 tests — processing time benchmarks
```

### Performance Benchmarks

From the test suite (measured on development hardware):

| Stage | Target | Measured |
|-------|--------|----------|
| Preprocessing (sharp) | < 200ms | ~150ms |
| Field Parsing | < 10ms | ~2ms |
| Field Matching | < 10ms | ~1ms |
| Full Pipeline (excl. OCR) | < 500ms | ~150ms |

The remaining budget (~4.5s) is allocated to Tesseract.js OCR, which varies by image complexity and server hardware.

---

## Deployment

### Deploy to Vercel

1. Push the repository to GitHub
2. Import the project on [vercel.com](https://vercel.com/new)
3. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL` — from Vercel Postgres
   - `BLOB_READ_WRITE_TOKEN` — from Vercel Blob Store
4. Deploy — Vercel handles build, serverless functions, and HTTPS automatically

### Vercel Configuration

The project includes a `vercel.json` for serverless function settings:

```json
{
  "functions": {
    "src/app/api/verify/route.ts": {
      "maxDuration": 60
    }
  }
}
```

The verify endpoint gets an extended timeout (60s) to accommodate OCR processing, especially for batch operations.

### Post-Deployment

After the first deployment:

```bash
# Run migrations against production database
npx prisma db push

# (Optional) Seed demo data
npx tsx prisma/seed.ts
```

---

## Production Scaling Path

### Immediate (Vercel Pro — $20/month)

- Up to 4 vCPUs, faster function execution
- 300s function timeout
- Fluid Compute for warm worker reuse
- Sufficient for expanded prototype or pilot program

### Production (Azure Government — Federal)

| MVP Component | Production Replacement | Reason |
|---------------|----------------------|--------|
| Vercel | **Azure Government App Service** | FedRAMP High authorized; TTB already on Azure |
| Vercel Postgres | **Azure Database for PostgreSQL** | FedRAMP compliant, managed service |
| Vercel Blob | **Azure Blob Storage** | FedRAMP compliant, data residency controls |
| Tesseract.js | **Azure AI Document Intelligence** or **Claude Vision** | Better accuracy on stylized fonts |
| No auth | **Login.gov** or **Agency SSO** | Federal identity management |

The cloud-agnostic service layer (provider pattern) means migrating to Azure is a deployment change, not a rewrite. New provider implementations slot into existing interfaces.

---

## Security & Compliance Roadmap

This section documents what would be required for production federal deployment. None is implemented in the prototype.

| Requirement | Description | MVP Status |
|-------------|-------------|------------|
| **FedRAMP** | All cloud services FedRAMP authorized | Not met (Vercel). Mitigated by cloud-agnostic architecture. |
| **FIPS 140-2** | Encryption at rest and in transit | Transit: HTTPS (met). At rest: default encryption (not FIPS-validated). |
| **Authentication** | PIV/CAC, agency SSO, or Login.gov | Not implemented. |
| **RBAC** | Agent, Supervisor, Admin roles | Not implemented (single-user prototype). |
| **Audit Logging** | Comprehensive trail of all actions | Partial — overrides store agent action + reason + timestamp. |
| **Section 508** | Accessibility compliance | Partial — semantic HTML, ARIA, keyboard nav, color contrast built in. |
| **ATO** | Authority to Operate process | Not applicable to prototype. |

### Architecture Decisions That Ease Production Transition

1. **Cloud-agnostic service layer** — OCR, storage, and database behind interfaces
2. **Audit-ready data model** — FieldResult records with overrides and reasons
3. **Section 508 from day one** — semantic HTML, ARIA, keyboard navigation
4. **No external API dependencies in OCR** — Tesseract.js runs locally, no firewall issues

---

## Future Enhancements

Documented for future development, prioritized by impact:

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **LLM-based OCR** | Swap Tesseract.js for Claude Vision, GPT-4o, or Azure Document Intelligence via the `OCRProvider` interface. Dramatically better accuracy on stylized fonts. | High |
| **TTB Form 5100.31 ingestion** | Parse actual form documents (PDF/DOCX) instead of CSV. Plug into the `IngestionProvider` interface. | High |
| **Client-side OCR** | Run Tesseract.js in the browser to eliminate server CPU costs. Shifts compute to user's machine. | Medium |
| **LLM-based matching** | Send extracted + expected values to an LLM for semantic comparison with reasoning. | Medium |
| **Feedback loop / threshold tuning** | Use stored manual overrides to automatically tune fuzzy matching thresholds. | Medium |
| **COLA system integration** | API integration with the existing .NET COLA system. | Low (long-term) |
| **Authentication & RBAC** | Login.gov / agency SSO, role-based access control. | Required for production |

### Swapping OCR Providers

To add a new OCR provider (e.g., Claude Vision):

1. Create `src/lib/services/ocr/claude-vision-provider.ts`
2. Implement the `OCRProvider` interface:
   ```typescript
   import type { OCRProvider, OCRResult } from '@/lib/types/ocr';

   export class ClaudeVisionProvider implements OCRProvider {
     async extractText(imageBuffer: Buffer): Promise<OCRResult> {
       // Call Claude Vision API
       // Return { rawText, confidence, regions }
     }
   }
   ```
3. Update `src/lib/services/ocr/index.ts` to export the new provider
4. No other code changes needed — the pipeline, API routes, and UI all work unchanged

---

## Project Structure

```
src/
  app/
    (pages)/
      submit/          # Single + batch application submission
      queue/           # Pending applications inbox
      application/[id]/ # Detail view + manual review
      history/         # Completed verifications
    api/
      applications/    # CRUD + batch endpoints
      verify/          # OCR verification pipeline
    layout.tsx         # Root layout with navigation
    page.tsx           # Redirects to /queue
  lib/
    services/
      ocr/             # Image preprocessing + Tesseract.js
      parser/          # Field extraction from OCR text
      matching/        # Exact, fuzzy, and numeric matchers
      ingestion/       # CSV parsing + batch pairing
      storage/         # Vercel Blob wrapper
      pipeline.ts      # Verification orchestrator
    db/
      client.ts        # Prisma singleton with Neon adapter
    types/             # Shared TypeScript interfaces
    api/
      client.ts        # Typed fetch wrapper for frontend
    constants.ts       # Thresholds, field labels, CSV schema
  components/
    ui/                # Button, StatusBadge, MatchIndicator, Toast, etc.
    forms/             # BeverageTypeSelector
    layout/            # AppShell, PageHeader
prisma/
  schema.prisma        # Database schema
  seed.ts              # Demo data seeder
test/
  services/            # Unit tests (77 total)
  integration/         # Pipeline integration tests
  performance/         # Timing benchmarks
  fixtures/            # Test data (CSV, JSON)
```
