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
    const doc = DatabaseService.getDocument(userId, docId);
    if (doc) {
      fileName = doc.fileName || '';
      docType = doc.documentType || 'other';
      summaryNotes = doc.extractedSummary?.notes || '';
      candidateTransactions = doc.candidateTransactions || [];
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
      const doc = DatabaseService.getDocument(userId, docId);
      if (doc) {
        fileName = fileName || doc.fileName || '';
        docType = docType !== 'other' ? docType : (doc.documentType || 'other');
        summaryNotes = doc.extractedSummary?.notes || '';
        candidateTransactions = doc.candidateTransactions || [];
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
        model: 'gemini-2.5-flash',
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
      // Regex extraction from text
      const providerMatch = fullText.match(/Provider\s+([A-Za-z0-9\s]+?)(?:\.|$)/i) || fullText.match(/([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*\s+(?:Appliances|Protection|Care|Insurance|LLC|Inc))/);
      const policyMatch = fullText.match(/Policy\s+#?([A-Za-z0-9-]+)/i);
      const titleMatch = fullText.match(/(?:RECEIPT\s*&\s*WARRANTY:\s*|WARRANTY:\s*)([A-Za-z0-9\s]+?)(?:\s+purchased|\.|$)/i);

      const provider = providerMatch ? providerMatch[1].trim() : (cleanedName || 'Bosch Home Appliances');
      const policy = policyMatch ? policyMatch[1].trim() : undefined;
      const title = titleMatch ? titleMatch[1].trim() : 'Household Warranty';

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
