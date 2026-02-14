import type { ParsedLabelFields } from '@/lib/types/matching';
import { KNOWN_CLASS_TYPES, KNOWN_APPELLATIONS, KNOWN_VARIETALS } from './known-values';

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Returns true if a line looks like an OCR artifact rather than real label text.
 * Artifact lines are things like "EE ———", "——", "|||", etc. that come from
 * decorative elements on labels being misread by the OCR engine.
 */
function isArtifactLine(line: string): boolean {
  const stripped = line.trim();
  if (stripped.length === 0) return true;
  // Repeated/low-diversity characters (e.g., "EEE", "RR RRRRRREEEE") — OCR artifact
  const alphaOnly = stripped.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const uniqueAlpha = new Set(alphaOnly);
  if (uniqueAlpha.size <= 2) return true;
  // Long strings with very low character diversity relative to length — OCR noise
  if (alphaOnly.length > 10 && uniqueAlpha.size < alphaOnly.length / 5) return true;
  // Keep lines that are a vintage year (e.g., "2021")
  if (/^(19|20)\d{2}$/.test(stripped)) return false;
  // Keep lines that look like measurements (net contents, ABV, etc.)
  // Accept 0Z as OCR misread of OZ
  if (/\d+\.?\d*\s*(%|mL|ml|L|FL|[O0]Z|oz|Proof)/i.test(stripped)) return false;
  // Count alphabetic characters that form real words (3+ alpha chars in a row)
  const realWords = stripped.match(/[a-zA-Z]{3,}/g);
  if (!realWords) return true; // no real words at all
  // If the line is mostly non-alpha noise (dashes, pipes, etc.), treat as artifact
  const alphaCount = (stripped.match(/[a-zA-Z]/g) || []).length;
  return alphaCount / stripped.length < 0.4;
}

function findBestMatch(text: string, candidates: string[]): string | null {
  const normalized = text.toLowerCase();
  // Sort by length descending so longer (more specific) matches win
  const sorted = [...candidates].sort((a, b) => b.length - a.length);
  for (const candidate of sorted) {
    if (normalized.includes(candidate.toLowerCase())) {
      // Extract the actual text from the source (preserves original case from OCR)
      const idx = normalized.indexOf(candidate.toLowerCase());
      return text.substring(idx, idx + candidate.length);
    }
  }
  return null;
}

function extractAlcoholContent(text: string): string | null {
  // Try multiple common ABV formats
  const patterns = [
    /(\d+\.?\d*)\s*%\s*Alc[.,]?\s*[\/\\]?\s*Vol[.,]?(\s*\(\d+\s*Proof\))?/i,
    /(\d+\.?\d*)\s*%\s*ABV/i,
    /Alc\.?\s*(\d+\.?\d*)\s*%\s*(?:by\s+)?Vol(?:ume)?\.?/i,
    /Alcohol\s*(\d+\.?\d*)\s*%\s*(?:by\s+)?Vol(?:ume)?\.?/i,
    /(\d+\.?\d*)\s*%\s*Alcohol/i,
    /ABV\s*(\d+\.?\d*)\s*%/i,
    /(\d+\.?\d*)\s*(?:Proof)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

function extractNetContents(text: string): string | null {
  // OCR commonly misreads O as 0 in "OZ", so accept both
  const pattern = /(\d+\.?\d*)\s*(mL|ml|L|l|FL\.?\s*[O0]Z\.?|fl\.?\s*[o0]z\.?)/i;
  const match = text.match(pattern);
  if (!match) return null;
  // Normalize OCR misreads: "0Z" → "OZ"
  return match[0].trim().replace(/0Z/g, 'OZ').replace(/0z/g, 'oz');
}

function extractGovernmentWarning(text: string): string | null {
  const anchorPattern = /['"]?\s*GOVERNMENT\s*WARNING/i;
  const anchorMatch = text.match(anchorPattern);
  if (!anchorMatch || anchorMatch.index === undefined) return null;

  // Capture from the anchor to the end of the warning paragraph
  const startIdx = anchorMatch.index;
  const remaining = text.substring(startIdx);

  // The warning ends at a double newline, or end of text, or when we hit
  // another section that clearly isn't part of the warning
  const endPatterns = [/\n\s*\n/, /\n[A-Z][a-z]+.*(?:Distiller|Winery|Brewing|Bottled|Product of)/];
  let endIdx = remaining.length;

  for (const endPattern of endPatterns) {
    const endMatch = remaining.match(endPattern);
    if (endMatch && endMatch.index !== undefined && endMatch.index > 50) {
      endIdx = Math.min(endIdx, endMatch.index);
    }
  }

  let extracted = normalizeText(remaining.substring(0, endIdx));

  // The warning always ends with "...may cause health problems."
  // Trim any trailing OCR artifacts (e.g. "EEE", "———") that got captured
  const healthProblemsIdx = extracted.search(/health\s+problems\.?/i);
  if (healthProblemsIdx >= 0) {
    const match = extracted.match(/health\s+problems\.?/i);
    if (match) {
      extracted = extracted.substring(0, healthProblemsIdx + match[0].length);
      // Ensure it ends with a period
      if (!extracted.endsWith('.')) extracted += '.';
    }
  }

  return extracted;
}

function extractCountryOfOrigin(text: string): string | null {
  const patterns = [
    /Product\s+of\s+([\w\s]+?)(?:\.|,|\n|$)/i,
    /Imported\s+(?:from|by)\s+([\w\s]+?)(?:\.|,|\n|$)/i,
    /Made\s+in\s+([\w\s]+?)(?:\.|,|\n|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractNameAddress(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Filter out lines that are part of the government warning
  const govStart = lines.findIndex((l) => /GOVERNMENT\s*WARNING/i.test(l));
  let govEnd = govStart;
  if (govStart >= 0) {
    // Government warning continues until a blank line or clearly different content
    for (let j = govStart + 1; j < lines.length; j++) {
      if (lines[j].length < 10) { govEnd = j - 1; break; }
      if (/\b[A-Z]{2}\s+\d{5}\b/.test(lines[j]) && !/health\s+problems/i.test(lines[j])) {
        govEnd = j - 1; break;
      }
      govEnd = j;
    }
  }

  const isGovWarningLine = (i: number) => govStart >= 0 && i >= govStart && i <= govEnd;

  // Look for lines containing state abbreviation + ZIP code
  const addressPattern = /\b[A-Z]{2}\s+\d{5}\b/;
  for (let i = 0; i < lines.length; i++) {
    if (isGovWarningLine(i)) continue;
    if (addressPattern.test(lines[i])) {
      // Take this line and possibly the line before it (if not gov warning)
      const prev = i - 1 >= 0 && !isGovWarningLine(i - 1) ? i - 1 : i;
      return lines.slice(prev, i + 1).join(', ');
    }
  }

  // Fallback: look for known business suffixes
  const businessPatterns = [/Distiller[yies]+/i, /Winery/i, /Brewing\s*Co/i, /Bottled\s+by/i, /Produced\s+by/i];
  for (let i = 0; i < lines.length; i++) {
    if (isGovWarningLine(i)) continue;
    for (const bp of businessPatterns) {
      if (bp.test(lines[i])) {
        const end = Math.min(lines.length, i + 3);
        return lines.slice(i, end).filter((_, idx) => !isGovWarningLine(i + idx)).join(', ');
      }
    }
  }

  return null;
}

function extractVintageDate(text: string): string | null {
  const pattern = /\b(19|20)\d{2}\b/;
  const match = text.match(pattern);
  return match ? match[0] : null;
}

function extractBrandName(text: string, classType: string | null): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Identify the government warning block (anchor line + all continuation lines)
  const govStartIdx = lines.findIndex((l) => /GOVERNMENT\s*WARNING/i.test(l));
  let govEndIdx = govStartIdx;
  if (govStartIdx >= 0) {
    for (let j = govStartIdx + 1; j < lines.length; j++) {
      if (/health\s+problems/i.test(lines[j])) { govEndIdx = j; break; }
      govEndIdx = j;
    }
  }
  const isGovBlock = (i: number) => govStartIdx >= 0 && i >= govStartIdx && i <= govEndIdx;

  // Helper: check if a line is a known non-brand field
  const isKnownField = (line: string): boolean => {
    if (/^\d+\.?\d*\s*%/i.test(line)) return true; // ABV
    if (/^\d+\s*(mL|L|FL)/i.test(line)) return true; // Net contents
    if (/GOVERNMENT\s*WARNING/i.test(line)) return true;
    if (/Surgeon\s*General/i.test(line)) return true; // gov warning continuation
    if (/birth\s*defects|impairs|health\s*problems/i.test(line)) return true; // gov warning body
    if (/Product\s+of/i.test(line)) return true;
    if (/Imported/i.test(line)) return true;
    if (/\b[A-Z]{2}\s+\d{5}\b/.test(line)) return true; // address with ZIP
    if (/\d+\s+\w+\s+(Street|St|Road|Rd|Ave|Lane|Ln|Blvd|Dr|Way)\b/i.test(line)) return true; // street address
    if (/\b(Distiller[yies]*|Winery|Brewing\s*Co|Bottled\s+by|Produced\s+by)\b/i.test(line)) return true; // producer line
    // Known appellations and varietals — not brand names
    const normLine = normalizeText(line).toLowerCase();
    if (KNOWN_APPELLATIONS.some((a) => normLine === a.toLowerCase())) return true;
    if (KNOWN_VARIETALS.some((v) => normLine === v.toLowerCase())) return true;
    return false;
  };

  // Pass 1: Brand name is typically the first significant line of text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 2) continue;
    if (isArtifactLine(line)) continue;
    if (isGovBlock(i)) continue; // skip entire government warning block
    if (/^[—\-–|_'"]/.test(line)) continue; // starts with dash/punctuation
    if (isKnownField(line)) continue;

    // If classType was found, skip lines that are the class/type
    if (classType && line.toLowerCase().includes(classType.toLowerCase())) {
      if (normalizeText(line).toLowerCase() === classType.toLowerCase()) continue;
      const ctIdx = line.toLowerCase().indexOf(classType.toLowerCase());
      if (ctIdx > 0) return normalizeText(line.substring(0, ctIdx));
    }

    return normalizeText(line);
  }

  // Pass 2: If first-line heuristic failed, look for a capitalized multi-word
  // phrase that isn't a known field (brand names are often in ALL CAPS)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isArtifactLine(line)) continue;
    if (isGovBlock(i)) continue;
    if (isKnownField(line)) continue;
    const normalized = normalizeText(line);
    // Look for lines that are mostly uppercase words (typical brand name styling)
    if (/^[A-Z][A-Z'\s]{4,}$/.test(normalized)) {
      return normalized;
    }
  }

  return null;
}

export function parseFieldsFromText(rawText: string): ParsedLabelFields {
  // Pre-filter: remove artifact lines from the raw text before parsing
  const cleanedRaw = rawText
    .split('\n')
    .filter((line) => !isArtifactLine(line))
    .join('\n');
  const text = normalizeText(cleanedRaw);

  const classType = findBestMatch(cleanedRaw, KNOWN_CLASS_TYPES);
  const brandName = extractBrandName(cleanedRaw, classType);
  const alcoholContent = extractAlcoholContent(text);
  const netContents = extractNetContents(text);
  const governmentWarning = extractGovernmentWarning(cleanedRaw);
  const countryOfOrigin = extractCountryOfOrigin(text);
  const nameAddress = extractNameAddress(cleanedRaw);
  const appellation = findBestMatch(cleanedRaw, KNOWN_APPELLATIONS);
  const varietal = findBestMatch(cleanedRaw, KNOWN_VARIETALS);
  const vintageDate = extractVintageDate(text);

  return {
    brandName,
    classType,
    alcoholContent,
    netContents,
    nameAddress,
    governmentWarning,
    countryOfOrigin,
    appellation,
    varietal,
    vintageDate,
  };
}
