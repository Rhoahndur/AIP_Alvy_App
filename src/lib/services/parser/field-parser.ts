import type { ParsedLabelFields } from '@/lib/types/matching';
import { KNOWN_CLASS_TYPES, KNOWN_APPELLATIONS, KNOWN_VARIETALS } from './known-values';

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
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
  const pattern = /(\d+\.?\d*)\s*%\s*Alc\.?\s*[\/\\]?\s*Vol\.?(\s*\(\d+\s*Proof\))?/i;
  const match = text.match(pattern);
  return match ? match[0].trim() : null;
}

function extractNetContents(text: string): string | null {
  const pattern = /(\d+\.?\d*)\s*(mL|ml|L|l|FL\.?\s*OZ\.?|fl\.?\s*oz\.?)/i;
  const match = text.match(pattern);
  return match ? match[0].trim() : null;
}

function extractGovernmentWarning(text: string): string | null {
  const anchorPattern = /GOVERNMENT\s*WARNING/i;
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

  return normalizeText(remaining.substring(0, endIdx));
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

  // Look for lines containing state abbreviation + ZIP code
  const addressPattern = /\b[A-Z]{2}\s+\d{5}\b/;
  for (let i = 0; i < lines.length; i++) {
    if (addressPattern.test(lines[i])) {
      // Take this line and possibly the line before it
      const start = Math.max(0, i - 1);
      return lines.slice(start, i + 1).join(', ');
    }
  }

  // Fallback: look for known business suffixes
  const businessPatterns = [/Distiller[yies]+/i, /Winery/i, /Brewing\s*Co/i, /Bottled\s+by/i, /Produced\s+by/i];
  for (let i = 0; i < lines.length; i++) {
    for (const bp of businessPatterns) {
      if (bp.test(lines[i])) {
        const end = Math.min(lines.length, i + 3);
        return lines.slice(i, end).join(', ');
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

  // Brand name is typically the first significant line of text
  // Skip lines that are recognized as other fields
  for (const line of lines) {
    if (line.length < 2) continue;
    if (/^\d+\.?\d*\s*%/i.test(line)) continue; // ABV
    if (/^\d+\s*(mL|L|FL)/i.test(line)) continue; // Net contents
    if (/GOVERNMENT\s*WARNING/i.test(line)) continue;
    if (/Product\s+of/i.test(line)) continue;
    if (/Imported/i.test(line)) continue;

    // If classType was found, skip lines that are the class/type
    if (classType && line.toLowerCase().includes(classType.toLowerCase())) {
      // If the line IS the class/type and nothing else, skip it
      if (normalizeText(line).toLowerCase() === classType.toLowerCase()) continue;
      // If brand name is on the same line as class/type, extract just the brand part
      const ctIdx = line.toLowerCase().indexOf(classType.toLowerCase());
      if (ctIdx > 0) return normalizeText(line.substring(0, ctIdx));
    }

    return normalizeText(line);
  }

  return null;
}

export function parseFieldsFromText(rawText: string): ParsedLabelFields {
  const text = normalizeText(rawText);

  const classType = findBestMatch(rawText, KNOWN_CLASS_TYPES);
  const brandName = extractBrandName(rawText, classType);
  const alcoholContent = extractAlcoholContent(text);
  const netContents = extractNetContents(text);
  const governmentWarning = extractGovernmentWarning(rawText);
  const countryOfOrigin = extractCountryOfOrigin(text);
  const nameAddress = extractNameAddress(rawText);
  const appellation = findBestMatch(rawText, KNOWN_APPELLATIONS);
  const varietal = findBestMatch(rawText, KNOWN_VARIETALS);
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
