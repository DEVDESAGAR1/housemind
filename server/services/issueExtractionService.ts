import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from './dbService';
import { evaluateIssueSafety } from './issueSafetyService';
import {
  HomeAsset,
  HouseholdIssueCandidate,
  NaturalLanguageIssueExtractionResult,
} from '../../src/types';
import { getGeminiApiKey } from '../config/secrets';

// Lazy Gemini client initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = getGeminiApiKey();
    if (!key) return null;
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Deterministic fallback extractor if Gemini is unavailable or rate-limited
 */
function deterministicFallbackExtractor(
  text: string,
  existingAssets: HomeAsset[],
  contextAssetId?: string | null
): NaturalLanguageIssueExtractionResult {
  const lower = text.toLowerCase();

  // Find matching existing asset if any
  let matchedAsset: HomeAsset | undefined;
  if (contextAssetId) {
    matchedAsset = existingAssets.find((a) => a.id === contextAssetId);
  }

  if (!matchedAsset) {
    matchedAsset = existingAssets.find((a) => {
      const nameMatch = a.name.toLowerCase();
      const brandMatch = a.brand?.toLowerCase();
      return (
        lower.includes(nameMatch) ||
        (brandMatch && brandMatch.length > 2 && lower.includes(brandMatch))
      );
    });
  }

  // Detect common household appliance/equipment categories in text
  const assetKeywords: Array<{ keyword: string; category: string; genericName: string }> = [
    { keyword: 'fridge', category: 'kitchen', genericName: 'Refrigerator' },
    { keyword: 'refrigerator', category: 'kitchen', genericName: 'Refrigerator' },
    { keyword: 'washing machine', category: 'laundry', genericName: 'Washing Machine' },
    { keyword: 'washer', category: 'laundry', genericName: 'Washing Machine' },
    { keyword: 'dryer', category: 'laundry', genericName: 'Dryer' },
    { keyword: 'dishwasher', category: 'kitchen', genericName: 'Dishwasher' },
    { keyword: 'ac', category: 'hvac', genericName: 'Air Conditioner' },
    { keyword: 'air condition', category: 'hvac', genericName: 'Air Conditioner' },
    { keyword: 'heat pump', category: 'hvac', genericName: 'Heat Pump' },
    { keyword: 'heater', category: 'hvac', genericName: 'Water Heater' },
    { keyword: 'geyser', category: 'plumbing', genericName: 'Geyser / Water Heater' },
    { keyword: 'water heater', category: 'plumbing', genericName: 'Water Heater' },
    { keyword: 'pipe', category: 'plumbing', genericName: 'Plumbing System' },
    { keyword: 'pipeline', category: 'plumbing', genericName: 'Plumbing Pipeline' },
    { keyword: 'toilet', category: 'plumbing', genericName: 'Toilet' },
    { keyword: 'fan', category: 'electrical', genericName: 'Ceiling Fan' },
    { keyword: 'wi-fi', category: 'electronics', genericName: 'Wi-Fi Router' },
    { keyword: 'wifi', category: 'electronics', genericName: 'Wi-Fi Router' },
    { keyword: 'router', category: 'electronics', genericName: 'Router' },
    { keyword: 'laptop', category: 'electronics', genericName: 'Laptop Computer' },
    { keyword: 'battery', category: 'power_backup', genericName: 'Battery Unit' },
    { keyword: 'car', category: 'vehicle', genericName: 'Personal Vehicle' },
    { keyword: 'bike', category: 'vehicle', genericName: 'Motorcycle / Bike' },
    { keyword: 'solar', category: 'solar_energy', genericName: 'Solar Inverter System' },
    { keyword: 'inverter', category: 'power_backup', genericName: 'Power Inverter' },
    { keyword: 'generator', category: 'power_backup', genericName: 'Backup Generator' },
  ];

  let detectedCategory = 'general';
  let genericAssetName = 'Household Equipment';

  if (matchedAsset) {
    detectedCategory = matchedAsset.category;
    genericAssetName = matchedAsset.name;
  } else {
    for (const item of assetKeywords) {
      if (lower.includes(item.keyword)) {
        detectedCategory = item.category;
        genericAssetName = item.genericName;
        break;
      }
    }
  }

  // Check for compound issues (e.g., "isn't cooling and there is water leaking underneath")
  const clauses = text
    .split(/\band\b|\balso\b|\bas well as\b|\bplus\b|\b;\b/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 5);

  const candidateIssues: HouseholdIssueCandidate[] = [];
  const safetyWarnings: string[] = [];

  const issueSnippets = clauses.length > 1 ? clauses : [text.trim()];

  for (const snippet of issueSnippets) {
    const safety = evaluateIssueSafety(snippet, text);
    if (safety.safetyWarning && !safetyWarnings.includes(safety.safetyWarning)) {
      safetyWarnings.push(safety.safetyWarning);
    }

    let title = snippet;
    if (title.length > 80) {
      title = `${title.slice(0, 77)}...`;
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    candidateIssues.push({
      title: `${genericAssetName}: ${title}`,
      description: `Observed issue reported from: "${snippet}". Full context: "${text}"`,
      assetName: matchedAsset ? matchedAsset.name : genericAssetName,
      assetId: matchedAsset ? matchedAsset.id : undefined,
      category: detectedCategory,
      severity: safety.isSafetyRisk ? (safety.suggestedSeverity || 'high') : 'medium',
      safetyWarning: safety.safetyWarning,
    });
  }

  const candidateAssets = matchedAsset
    ? [
        {
          name: matchedAsset.name,
          category: matchedAsset.category,
          brand: matchedAsset.brand,
          existingAssetId: matchedAsset.id,
          isNewAsset: false,
        },
      ]
    : [
        {
          name: genericAssetName,
          category: detectedCategory,
          isNewAsset: true,
        },
      ];

  return {
    candidateAssets,
    candidateIssues,
    safetyWarnings,
    confidence: 0.85,
  };
}

/**
 * Extracts structured issue and asset candidates from natural language text.
 * Strictly produces candidate records for user review; NEVER writes directly to DB.
 */
export async function extractIssueCandidateFromNaturalLanguage(
  userId: string,
  text: string,
  contextAssetId?: string | null
): Promise<NaturalLanguageIssueExtractionResult> {
  const existingAssets = await DatabaseService.listAssets(userId);
  const ai = getAI();

  // If no Gemini key available or short text, use robust deterministic extractor
  if (!ai || text.length < 5) {
    return deterministicFallbackExtractor(text, existingAssets, contextAssetId);
  }

  try {
    const assetInventorySummary = existingAssets
      .map((a) => `- ID: ${a.id}, Name: ${a.name}, Brand: ${a.brand || 'N/A'}, Category: ${a.category}`)
      .join('\n');

    const prompt = `You are HouseMind's Autonomous Household Issue Triage Engine.
A homeowner reported the following household observation or problem:
"""${text}"""

${
  contextAssetId
    ? `Context Asset ID provided: ${contextAssetId}`
    : `Homeowner's registered household assets:\n${assetInventorySummary || 'None registered yet.'}`
}

Your task is to produce structured candidate data for the homeowner to review before saving.
Do NOT fabricate repairs. Separate compound problems (e.g. cooling failure vs water leak) into distinct issues if there are multiple faults.

Respond strictly in JSON matching this schema:
{
  "matchedExistingAssetId": string | null,
  "candidateAssetName": string,
  "candidateAssetCategory": string,
  "candidateAssetBrand": string | null,
  "isNewAsset": boolean,
  "issues": [
    {
      "title": string,
      "description": string,
      "category": string,
      "suggestedSeverity": "critical" | "high" | "medium" | "low",
      "suggestedProviderType": string | null,
      "estimatedCost": number | null
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const contentText = response.text || '';
    const parsed = JSON.parse(contentText);

    const safetyWarnings: string[] = [];
    const candidateIssues: HouseholdIssueCandidate[] = [];

    const matchedExistingAsset = parsed.matchedExistingAssetId
      ? existingAssets.find((a) => a.id === parsed.matchedExistingAssetId)
      : undefined;

    const finalAssetName = matchedExistingAsset
      ? matchedExistingAsset.name
      : parsed.candidateAssetName || 'Household Asset';

    for (const rawIssue of parsed.issues || []) {
      const safety = evaluateIssueSafety(rawIssue.title || '', rawIssue.description || text);
      if (safety.safetyWarning && !safetyWarnings.includes(safety.safetyWarning)) {
        safetyWarnings.push(safety.safetyWarning);
      }

      const severity = safety.isSafetyRisk
        ? (safety.suggestedSeverity || 'high')
        : (rawIssue.suggestedSeverity || 'medium');

      candidateIssues.push({
        title: rawIssue.title || 'Household Issue',
        description: rawIssue.description || text,
        assetName: finalAssetName,
        assetId: matchedExistingAsset ? matchedExistingAsset.id : undefined,
        category: rawIssue.category || matchedExistingAsset?.category || parsed.candidateAssetCategory || 'general',
        severity,
        safetyWarning: safety.safetyWarning,
        suggestedProvider: rawIssue.suggestedProviderType || undefined,
        estimatedCost: typeof rawIssue.estimatedCost === 'number' ? rawIssue.estimatedCost : undefined,
      });
    }

    if (candidateIssues.length === 0) {
      return deterministicFallbackExtractor(text, existingAssets, contextAssetId);
    }

    const candidateAssets = matchedExistingAsset
      ? [
          {
            name: matchedExistingAsset.name,
            category: matchedExistingAsset.category,
            brand: matchedExistingAsset.brand,
            existingAssetId: matchedExistingAsset.id,
            isNewAsset: false,
          },
        ]
      : [
          {
            name: parsed.candidateAssetName || 'New Household Asset',
            category: parsed.candidateAssetCategory || 'general',
            brand: parsed.candidateAssetBrand || undefined,
            isNewAsset: true,
          },
        ];

    return {
      candidateAssets,
      candidateIssues,
      safetyWarnings,
      confidence: 0.95,
    };
  } catch (err) {
    console.warn('[ISSUE_EXTRACTOR] Falling back to deterministic extractor:', err);
    return deterministicFallbackExtractor(text, existingAssets, contextAssetId);
  }
}
