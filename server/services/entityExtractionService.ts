import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from './dbService';
import {
  ExtractedEntityReviewData,
  HouseholdEntityType,
  Property,
  Asset,
  Warranty,
  MaintenanceTask,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
} from '../../src/types';
import crypto from 'crypto';

// Lazy Gemini client initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
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
 * Intelligent AI Entity Extractor for Phase 10 "Run the Home"
 * Extracts structured Property, Asset, Warranty, Maintenance, Utility, Loan, or Credit Card
 * data from uploaded document text/metadata for user review and explicit saving.
 */
export async function extractEntityFromDocument(
  userId: string,
  documentIdOrOptions: string | {
    documentId?: string;
    fileBase64?: string;
    documentText?: string;
    fileName?: string;
    fileType?: string;
    documentType?: string;
    targetEntityType?: HouseholdEntityType;
    targetEntityHint?: HouseholdEntityType;
    suggestedType?: HouseholdEntityType;
    additionalNotes?: string;
  },
  targetEntityType?: HouseholdEntityType,
  additionalNotes?: string
): Promise<ExtractedEntityReviewData> {
  let docId: string | undefined;
  let fileName = '';
  let docType = 'other';
  let summaryNotes = '';
  let candidateTransactions: any[] = [];
  let directText = '';
  let userNotes = additionalNotes || '';
  let requestedType = targetEntityType;

  if (typeof documentIdOrOptions === 'string') {
    docId = documentIdOrOptions;
    const doc = await DatabaseService.getDocument(userId, docId);
    if (doc) {
      fileName = doc.fileName || '';
      docType = doc.documentType || 'other';
      summaryNotes = doc.extractedSummary?.notes || '';
      candidateTransactions = (doc as any).candidateTransactions || (doc as any).transactionCandidates || [];
    } else {
      fileName = `Document_${docId}`;
    }
  } else if (typeof documentIdOrOptions === 'object' && documentIdOrOptions !== null) {
    docId = documentIdOrOptions.documentId;
    fileName = documentIdOrOptions.fileName || '';
    docType = documentIdOrOptions.documentType || documentIdOrOptions.fileType || 'other';
    directText = documentIdOrOptions.documentText || '';
    userNotes = documentIdOrOptions.additionalNotes || userNotes;
    requestedType = requestedType || documentIdOrOptions.targetEntityType || documentIdOrOptions.targetEntityHint || documentIdOrOptions.suggestedType;

    if (docId) {
      const doc = await DatabaseService.getDocument(userId, docId);
      if (doc) {
        fileName = fileName || doc.fileName || '';
        docType = docType !== 'other' ? docType : (doc.documentType || 'other');
        summaryNotes = doc.extractedSummary?.notes || '';
        candidateTransactions = (doc as any).candidateTransactions || (doc as any).transactionCandidates || [];
      }
    }
  }

  const candidateText = candidateTransactions
    .slice(0, 15)
    .map((t) => `${t.date || ''} | ${t.description || ''} | ${t.amount || ''} | ${t.category || ''}`)
    .join('\n');

  const contextText = `
Document File Name: ${fileName}
Document Type: ${docType}
Extracted Summary Notes: ${summaryNotes}
Direct Content / Text:
${directText}
Candidate Rows:
${candidateText}
Additional User Notes: ${userNotes || 'None'}
`.trim();

  // Determine likely entity type if not specified
  let detectedType: HouseholdEntityType = requestedType || 'asset';
  if (!requestedType) {
    const lower = `${fileName} ${summaryNotes} ${directText}`.toLowerCase();
    if (lower.includes('mortgage') || lower.includes('loan') || lower.includes('emi') || lower.includes('amortization')) {
      detectedType = 'loan';
    } else if (lower.includes('credit card') || lower.includes('statement') && (lower.includes('apr') || lower.includes('limit') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('amex'))) {
      detectedType = 'credit_card';
    } else if (lower.includes('electric') || lower.includes('power') || lower.includes('water') || lower.includes('utility') || lower.includes('internet') || lower.includes('broadband') || lower.includes('gas') || lower.includes('sewer') || lower.includes('trash')) {
      detectedType = 'utility';
    } else if (lower.includes('warranty') || lower.includes('applecare') || lower.includes('protection plan') || lower.includes('guarantee')) {
      detectedType = 'warranty';
    } else if (lower.includes('service') || lower.includes('filter') || lower.includes('maintenance') || lower.includes('repair') || lower.includes('tune-up')) {
      detectedType = 'maintenance';
    } else if (lower.includes('deed') || lower.includes('title') || lower.includes('property') || lower.includes('lease') || lower.includes('home appraisal')) {
      detectedType = 'property';
    } else {
      detectedType = 'asset';
    }
  }

  const ai = getAI();
  let extractedFields: Record<string, any> = {};
  let confidenceScore = 0.85;
  let sourceReferences: string[] = [`Document: ${fileName}`];
  let warnings: string[] = [];

  if (ai) {
    try {
      const prompt = `
You are HouseMind's AI Household Entity Intelligence parser.
Analyze the following document context and extract structured JSON matching the entity type: "${detectedType}".

Entity Types and Expected Field Mappings:
1. "property": name (e.g. Maplewood Haven), propertyType (primary_home, rental_property, vacation_home, land, commercial), address { street, city, region, postalCode, country }, purchaseDate (YYYY-MM-DD), purchaseValue (number), squareFootage (number), yearBuilt (number), notes.
2. "asset": name (e.g. Trane Heat Pump), category (hvac, plumbing, electrical, roof, kitchen, major_appliance, electronics, vehicle, outdoor_garden, furniture, smart_home, security, other), brand, modelNumber, serialNumber, installDate (YYYY-MM-DD), warrantyExpiryDate (YYYY-MM-DD), expectedLifespanYears (number), purchaseCost (number), currentEstimatedValue (number), roomLocation, maintenanceNotes.
3. "warranty": warrantyProvider, policyNumber, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), durationMonths (number), coverageNotes, contactInfo { phone, email, website }.
4. "maintenance": title, serviceDate (YYYY-MM-DD), nextServiceDate (YYYY-MM-DD), cost (number), serviceProvider, contactPhone, notes, recurringSchedule (monthly, quarterly, semi_annual, annual, bi_annual, as_needed).
5. "utility": name, serviceType (electricity, water, gas, internet, trash, solar, heating, sewer, hoa, other), provider, accountIdentifier, billingCycle (monthly, quarterly, annual, bi_monthly), dueDateDay (1-31), typicalAmount (number), latestBillAmount (number), notes.
6. "loan": loanName, loanType (home_loan, vehicle_loan, personal_loan, education_loan, renovation_loan, line_of_credit, other), lender, principalAmount (number), interestRate (number), emiAmount (number), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), tenureMonths (number), paymentDueDay (1-31), outstandingAmount (number), notes.
7. "credit_card": cardNickname, cardIssuer, last4Digits (4 numeric digits), creditLimit (number), billingCycleDay (1-31), paymentDueDate (YYYY-MM-DD), outstandingAmount (number), minimumDue (number), aprRate (number), notes.

Context:
${contextText}

Return ONLY a valid JSON object with the following structure:
{
  "entityType": "${detectedType}",
  "confidenceScore": 0.9,
  "sourceReferences": ["specific extracted snippets"],
  "warnings": ["any ambiguities or unverified assumptions"],
  "extractedFields": { ... }
}
`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        extractedFields = parsed.extractedFields || {};
        if (typeof parsed.confidenceScore === 'number') {
          confidenceScore = Math.max(0.1, Math.min(1.0, parsed.confidenceScore));
        }
        if (Array.isArray(parsed.sourceReferences)) {
          sourceReferences = parsed.sourceReferences;
        }
        if (Array.isArray(parsed.warnings)) {
          warnings = parsed.warnings;
        }
      }
    } catch (err: any) {
      console.warn('[AI_ENTITY_EXTRACT] Gemini extraction fallback to heuristics:', err?.message);
      extractedFields = buildHeuristicExtraction(detectedType, fileName, summaryNotes, candidateTransactions, directText);
      confidenceScore = 0.72;
      warnings.push('AI extraction used heuristic pattern matching.');
    }
  } else {
    extractedFields = buildHeuristicExtraction(detectedType, fileName, summaryNotes, candidateTransactions, directText);
    confidenceScore = 0.7;
    warnings.push('Gemini API unavailable; local heuristic extraction used.');
  }

  // Ensure mandatory defaults based on detectedType
  normalizeExtractedFields(detectedType, extractedFields, fileName);

  return {
    extractionId: `ext_${crypto.randomUUID().slice(0, 8)}`,
    documentType: (docType as any) || 'other',
    suggestedEntity: (detectedType as any) || 'asset',
    confidence: confidenceScore,
    sourceDocumentId: docId || '',
    sourceFileName: fileName,
    detectedEntityType: detectedType,
    confidenceScore,
    extractedFields,
    sourceReferences,
    warnings,
    extractedAt: new Date().toISOString(),
    status: 'pending_review',
  };
}

/**
 * Safe, linear-time warranty provider extraction without polynomial backtracking.
 * Replaces vulnerable regex with bounded string slicing and token inspection.
 */
export function extractSafeWarrantyProvider(text: string): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const boundedText = text.slice(0, 4096);

  // 1. Explicit keyword search: "Provider: <name>" or "Provider <name>"
  const providerIndex = boundedText.search(/\bprovider\b/i);
  if (providerIndex !== -1) {
    const after = boundedText.slice(providerIndex);
    const prefixMatch = after.match(/^provider\s*[:#-]?\s*/i);
    if (prefixMatch) {
      const rest = after.slice(prefixMatch[0].length);
      // Take first 80 characters max and stop at period, newline, semicolon, or comma
      const lineSnippet = rest.slice(0, 80).split(/[.\n\r;\t,]/)[0].trim();
      if (lineSnippet.length > 0 && lineSnippet.length <= 60 && /^[\w\s&-]+$/.test(lineSnippet)) {
        return lineSnippet;
      }
    }
  }

  // 2. Suffix scan for appliance/insurance companies (e.g. "Bosch Appliances", "SquareTrade Protection")
  // Tokenize words safely (bounded array of max 200 tokens)
  const tokens = boundedText.split(/\s+/).slice(0, 200);
  const targetSuffixes = new Set(['appliances', 'protection', 'care', 'insurance', 'llc', 'inc']);

  for (let i = 0; i < tokens.length; i++) {
    const cleanWord = tokens[i].replace(/[^\w]/g, '');
    if (targetSuffixes.has(cleanWord.toLowerCase()) && i > 0) {
      const captured: string[] = [cleanWord];
      for (let j = i - 1; j >= Math.max(0, i - 2); j--) {
        const prev = tokens[j].replace(/[^\w]/g, '');
        if (prev.length > 0 && /^[A-Z][a-z0-9]*$/.test(prev)) {
          captured.unshift(prev);
        } else {
          break;
        }
      }
      if (captured.length > 1) {
        return captured.join(' ');
      }
    }
  }

  return undefined;
}

/**
 * Safe, linear-time policy number extraction with bounded search window.
 */
export function extractSafePolicyNumber(text: string): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const boundedText = text.slice(0, 4096);
  const policyIdx = boundedText.search(/\bpolicy\b/i);
  if (policyIdx === -1) return undefined;

  const snippet = boundedText.slice(policyIdx, policyIdx + 60);
  const match = snippet.match(/^policy\s*[:#]?\s*([A-Za-z0-9-]{3,32})\b/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Safe, linear-time warranty title extraction.
 * Locates "RECEIPT & WARRANTY:" or "WARRANTY:" without polynomial backtracking.
 */
export function extractSafeWarrantyTitle(text: string): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const boundedText = text.slice(0, 4096);

  const marker = boundedText.search(/\b(?:receipt\s*&\s*warranty|warranty)\s*:\s*/i);
  if (marker === -1) return undefined;

  const after = boundedText.slice(marker);
  const prefixMatch = after.match(/^(?:receipt\s*&\s*warranty|warranty)\s*:\s*/i);
  if (!prefixMatch) return undefined;

  const windowText = after.slice(prefixMatch[0].length, prefixMatch[0].length + 100);
  const purchasedIndex = windowText.search(/\s+purchased\b/i);
  const rawTitle = purchasedIndex !== -1 ? windowText.slice(0, purchasedIndex) : windowText.split(/[.\n\r;\t]/)[0];
  const cleanTitle = rawTitle.trim();

  if (cleanTitle.length > 0 && cleanTitle.length <= 80 && /^[\w\s&-]+$/.test(cleanTitle)) {
    return cleanTitle;
  }
  return undefined;
}

/**
 * Heuristic fallback parser when AI API is unavailable
 */
function buildHeuristicExtraction(
  type: HouseholdEntityType,
  fileName: string,
  summary: string,
  candidates: any[],
  directText: string = ''
): Record<string, any> {
  const fields: Record<string, any> = {};
  const fullText = `${fileName} ${summary} ${directText}`;
  const cleanedName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const firstAmount = candidates.length > 0 && typeof candidates[0].amount === 'number' ? Math.abs(candidates[0].amount) : undefined;
  
  // Date extractors
  const dateMatches = fullText.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const firstDate = dateMatches[0] || (candidates.length > 0 && candidates[0].date ? candidates[0].date : new Date().toISOString().slice(0, 10));
  const secondDate = dateMatches[1] || undefined;

  switch (type) {
    case 'property':
      fields.name = cleanedName || 'My Property';
      fields.propertyType = 'primary_home';
      fields.purchaseValue = firstAmount || 350000;
      fields.purchaseDate = firstDate;
      fields.address = { street: '', city: '', region: '', postalCode: '', country: 'United States' };
      break;

    case 'asset':
      fields.name = cleanedName || 'Household Asset';
      fields.category = 'major_appliance';
      fields.purchaseCost = firstAmount || 1200;
      fields.installDate = firstDate;
      fields.expectedLifespanYears = 10;
      fields.currentStatus = 'operational';
      break;

    case 'warranty': {
      // Safe, bounded extraction without polynomial backtracking
      const boundedContext = fullText.slice(0, 4096);
      const safeProvider = extractSafeWarrantyProvider(boundedContext);
      const safePolicy = extractSafePolicyNumber(boundedContext);
      const safeTitle = extractSafeWarrantyTitle(boundedContext);

      const provider = safeProvider || (cleanedName || 'Bosch Home Appliances');
      const policy = safePolicy || undefined;
      const title = safeTitle || 'Household Warranty';

      fields.warrantyProvider = provider;
      fields.providerName = provider;
      fields.title = title;
      if (policy) fields.policyNumber = policy;
      fields.startDate = firstDate;
      fields.endDate = secondDate || new Date(Date.now() + 365 * 2 * 86400000).toISOString().slice(0, 10);
      fields.expirationDate = fields.endDate;
      fields.durationMonths = 24;
      fields.coverageNotes = 'Standard manufacturer warranty protection.';
      break;
    }

    case 'maintenance':
      fields.title = `${cleanedName} Inspection & Service`;
      fields.serviceDate = firstDate;
      fields.dueDate = firstDate;
      fields.cost = firstAmount || 100;
      fields.recurringSchedule = 'annual';
      fields.status = 'scheduled';
      break;

    case 'utility':
      fields.name = cleanedName || 'Utility Service';
      fields.serviceType = 'electricity';
      fields.typicalAmount = firstAmount || 150;
      fields.latestBillAmount = firstAmount || 150;
      fields.billingCycle = 'monthly';
      fields.dueDateDay = 15;
      fields.paymentStatus = 'pending';
      break;

    case 'loan':
      fields.loanName = cleanedName || 'Household Loan';
      fields.loanType = 'home_loan';
      fields.principalAmount = firstAmount ? firstAmount * 100 : 250000;
      fields.emiAmount = firstAmount || 1500;
      fields.interestRate = 6.0;
      fields.tenureMonths = 360;
      fields.startDate = firstDate;
      fields.paymentDueDay = 1;
      fields.status = 'active';
      break;

    case 'credit_card':
      fields.cardNickname = cleanedName || 'Household Credit Card';
      fields.cardIssuer = 'Bank / Card Issuer';
      fields.last4Digits = '1234';
      fields.creditLimit = 10000;
      fields.outstandingAmount = firstAmount || 450;
      fields.paymentStatus = 'pending';
      fields.billingCycleDay = 15;
      break;
  }

  return fields;
}

/**
 * Normalizes and guards default fields
 */
function normalizeExtractedFields(type: HouseholdEntityType, fields: Record<string, any>, fileName: string) {
  if (!fields.name && (type === 'property' || type === 'asset' || type === 'utility')) {
    fields.name = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'New Household Item';
  }

  if (type === 'warranty') {
    if (!fields.providerName && fields.warrantyProvider) {
      fields.providerName = fields.warrantyProvider;
    }
    if (!fields.warrantyProvider && fields.providerName) {
      fields.warrantyProvider = fields.providerName;
    }
    if (!fields.title) {
      fields.title = fields.providerName || fields.warrantyProvider || 'Warranty Policy';
    }
  }
}

/**
 * Persists the user-reviewed and approved entity into the database with source document linking
 */
export async function saveExtractedEntity(
  userId: string,
  entityType: HouseholdEntityType,
  entityData: Record<string, any>,
  sourceDocumentId?: string
): Promise<{ success: boolean; entityId: string; entityType: HouseholdEntityType; entity: any }> {
  const auditMeta = {
    userId,
    sourceType: sourceDocumentId ? 'document_extracted' : 'manual_entry',
    dataType: entityType,
    documentId: sourceDocumentId,
    importedAt: new Date().toISOString(),
    userConfirmed: true,
    processingStatus: 'confirmed' as const,
    deletionStatus: 'active' as const,
  };

  let savedEntity: any;

  switch (entityType) {
    case 'property':
      savedEntity = DatabaseService.createProperty(userId, {
        ...entityData,
        sourceMetadata: auditMeta,
      } as any);
      break;

    case 'room':
      savedEntity = DatabaseService.createRoom(userId, {
        ...entityData,
      } as any);
      break;

    case 'asset':
      savedEntity = DatabaseService.createAsset(userId, {
        ...entityData,
        sourceMetadata: auditMeta,
      } as any);
      break;

    case 'warranty':
      savedEntity = DatabaseService.createWarranty(userId, {
        ...entityData,
        documentId: sourceDocumentId || entityData.documentId,
      } as any);
      break;

    case 'maintenance':
      savedEntity = DatabaseService.createMaintenance(userId, {
        ...entityData,
        documentId: sourceDocumentId || entityData.documentId,
      } as any);
      break;

    case 'utility':
      savedEntity = DatabaseService.createUtility(userId, {
        ...entityData,
        documentId: sourceDocumentId || entityData.documentId,
      } as any);
      break;

    case 'loan':
      savedEntity = DatabaseService.createLoan(userId, {
        ...entityData,
        documentId: sourceDocumentId || entityData.documentId,
      } as any);
      break;

    case 'credit_card':
      savedEntity = DatabaseService.createCreditCard(userId, {
        ...entityData,
        documentId: sourceDocumentId || entityData.documentId,
      } as any);
      break;

    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }

  return {
    success: true,
    entityId: savedEntity.id,
    entityType,
    entity: savedEntity,
  };
}
