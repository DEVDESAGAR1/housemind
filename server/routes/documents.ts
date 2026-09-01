import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  idParamSchema,
  confirmImportSchema,
  rejectImportSchema,
} from '../schemas';
import {
  parseDocumentWithGemini,
} from '../services/documentParserService';
import {
  checkDuplicateCandidates,
  persistConfirmedTransactions,
} from '../services/transactionService';
import { DatabaseService } from '../services/dbService';
import { HouseholdDocument, DocumentType } from '../../src/types';
import {
  extractEntityFromDocument,
  saveExtractedEntity,
} from '../services/entityExtractionService';
import {
  extractEntityFromDocSchema,
  saveExtractedEntitySchema,
} from '../schemas';

export const documentsRouter = Router();

/**
 * POST /api/documents/extract-entity
 * Extracts structured home entity data (asset, warranty, maintenance, utility, loan, credit_card) from raw or base64 document
 */
documentsRouter.post(
  '/extract-entity',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { documentText, fileBase64, fileName, fileType, documentType, suggestedType, targetEntityHint } = req.body;

    try {
      const result = await extractEntityFromDocument(userId, {
        documentText,
        fileBase64,
        fileName: fileName || 'document.pdf',
        fileType: fileType || 'application/pdf',
        documentType,
        targetEntityHint: targetEntityHint || suggestedType,
      });

      res.status(200).json({
        success: true,
        entityType: result.detectedEntityType,
        extractedData: result.extractedFields,
        extractedFields: result.extractedFields,
        confidence: result.confidenceScore,
        confidenceScore: result.confidenceScore,
        sourceReferences: result.sourceReferences,
        warnings: result.warnings,
        data: result,
      });
    } catch (error: unknown) {
      console.error('[DOCUMENTS_ROUTER] Extract entity failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXTRACTION_ERROR',
          message: error instanceof Error ? error.message : 'Entity extraction failed.',
        },
      });
    }
  }
);

/**
 * POST /api/documents/save-extracted-entity
 * Directly persists an extracted entity to the appropriate household collection
 */
documentsRouter.post(
  '/save-extracted-entity',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const parseResult = saveExtractedEntitySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payload for saving extracted entity.',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const saved = await saveExtractedEntity(
        userId,
        parseResult.data.targetEntity,
        parseResult.data.payload,
        parseResult.data.documentId || undefined
      );

      res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (error: unknown) {
      console.error('[DOCUMENTS_ROUTER] Save entity failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to save entity record.',
        },
      });
    }
  }
);

// Configure Multer for secure in-memory uploads (Max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/csv',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Unsupported file format. Please upload a PDF, CSV, Excel, or image statement/bill.'
        )
      );
    }
  },
});

const handleFileUpload = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: err.message || 'Unsupported file format uploaded.',
        },
      });
      return;
    }
    next();
  });
};

/**
 * POST /api/documents/upload
 * Upload and parse document candidates securely with Gemini.
 */
documentsRouter.post(
  '/upload',
  requireAuth as any,
  handleFileUpload,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_PROVIDED',
            message: 'Please select a document file to upload.',
          },
        });
        return;
      }

      const hintDocType = req.body?.documentType as DocumentType | undefined;

      // Extract via Gemini with prompt-injection defenses
      const parsed = await parseDocumentWithGemini(
        userId,
        file.originalname,
        file.mimetype,
        file.buffer,
        hintDocType
      );

      // Deterministic duplicate cross-referencing
      const candidatesWithDupCheck = await checkDuplicateCandidates(
        userId,
        parsed.candidates
      );

      const id = `doc_${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString();

      const documentRecord: HouseholdDocument = {
        id,
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        documentType: parsed.documentType,
        status: 'pending_review',
        extractedSummary: parsed.summary,
        transactionCandidates: candidatesWithDupCheck,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await DatabaseService.saveDocument(userId, documentRecord as any);

      // Check for existing identical document
      const existingDocs = await DatabaseService.listDocuments(userId);
      const matchingDoc = existingDocs.find(
        (d) =>
          d.fileName?.toLowerCase() === file.originalname.toLowerCase() &&
          d.fileSize &&
          Math.abs(d.fileSize - file.size) < 10
      );

      const duplicatesCount = candidatesWithDupCheck.filter((c) => c.isDuplicate).length;

      res.status(201).json({
        success: true,
        document: documentRecord,
        candidatesCount: candidatesWithDupCheck.length,
        duplicatesCount,
        isDuplicateDocument: Boolean(matchingDoc),
        existingDocument: matchingDoc || null,
        message: matchingDoc
          ? 'This document may already exist in your vault. Please review candidate information.'
          : 'Document analyzed successfully. Please review and confirm the transactions.',
      });
    } catch (err: any) {
      console.error('Error during document upload/parse:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message:
            err.message ||
            "We couldn't read this statement. Please check that the file is not corrupted and try again.",
        },
      });
    }
  }
);

/**
 * POST /api/documents/check-duplicate
 * Pre-checks if a document with the same filename or size was already uploaded.
 */
documentsRouter.post(
  '/check-duplicate',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { fileName, fileSize } = req.body;
      const existingDocs = await DatabaseService.listDocuments(userId);
      const match = existingDocs.find(
        (d) =>
          d.fileName?.toLowerCase() === (fileName || '').toLowerCase() &&
          (!fileSize || !d.fileSize || Math.abs((d.fileSize || 0) - fileSize) < 10)
      );

      res.json({
        success: true,
        isDuplicate: Boolean(match),
        existingDocument: match || null,
        message: match
          ? `A document with this name (${match.fileName}) was already uploaded on ${new Date(
              match.createdAt || (match as any).uploadedAt || Date.now()
            ).toLocaleDateString()}.`
          : 'No duplicate document found.',
      });
    } catch (err: any) {
      console.error('[DOCUMENTS_ROUTER] Duplicate check failed:', err);
      res.status(500).json({
        success: false,
        error: { code: 'CHECK_FAILED', message: err.message },
      });
    }
  }
);

/**
 * POST /api/documents/save-document-only
 * Saves a document record to the vault without extracting or persisting child entities.
 */
documentsRouter.post(
  '/save-document-only',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { documentId, fileName, fileType, fileSize, documentType, notes } = req.body;
      let doc = documentId ? await DatabaseService.getDocument(userId, documentId) : null;
      const nowIso = new Date().toISOString();

      if (doc) {
        doc.status = 'confirmed';
        doc.updatedAt = nowIso;
        if (notes) {
          doc.extractedSummary = { ...(doc.extractedSummary || {}), notes };
        }
        await DatabaseService.saveDocument(userId, doc);
      } else {
        const id = `doc_${crypto.randomUUID()}`;
        doc = {
          id,
          userId,
          fileName: fileName || 'Uploaded Document',
          fileType: fileType || 'application/pdf',
          fileSize: fileSize || 0,
          documentType: documentType || 'other',
          status: 'confirmed',
          extractedSummary: { notes },
          transactionCandidates: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await DatabaseService.saveDocument(userId, doc);
      }

      res.status(201).json({
        success: true,
        document: doc,
        message: 'Document saved to vault successfully.',
      });
    } catch (err: any) {
      console.error('[DOCUMENTS_ROUTER] Save document only failed:', err);
      res.status(500).json({
        success: false,
        error: { code: 'SAVE_FAILED', message: err.message },
      });
    }
  }
);

/**
 * GET /api/documents
 * List user documents.
 */
documentsRouter.get(
  '/',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const documents = await DatabaseService.listDocuments(userId);
      res.json({ success: true, documents });
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOCUMENTS_FETCH_FAILED',
          message: 'Failed to retrieve documents. Please try again.',
        },
      });
    }
  }
);

/**
 * GET /api/documents/:id
 * Retrieve specific document details and candidates.
 */
documentsRouter.get(
  '/:id',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid document ID' },
        });
        return;
      }

      const doc = await DatabaseService.getDocument(userId, parsedId.data.id);
      if (!doc) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
        return;
      }

      res.json({ success: true, document: doc });
    } catch (err: any) {
      console.error('Error fetching document:', err);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch document' },
      });
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Delete document record.
 */
documentsRouter.delete(
  '/:id',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid document ID' },
        });
        return;
      }

      const deleted = await DatabaseService.deleteDocument(userId, parsedId.data.id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
        return;
      }

      res.json({ success: true, message: 'Document deleted' });
    } catch (err: any) {
      console.error('Error deleting document:', err);
      res.status(500).json({
        success: false,
        error: { code: 'DELETE_ERROR', message: 'Failed to delete document' },
      });
    }
  }
);

// ==========================================
// Import Confirmation & Rejection Routes
// ==========================================
export const importsRouter = Router();

/**
 * POST /api/imports/:id/confirm
 * Explicit user confirmation committing selected candidates to trusted transactions.
 */
importsRouter.post(
  '/:id/confirm',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid import ID' },
        });
        return;
      }

      const parsedBody = confirmImportSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsedBody.error.issues[0]?.message || 'Invalid confirmation payload',
            details: parsedBody.error.issues as any,
          },
        });
        return;
      }

      const documentId = parsedId.data.id;
      const { candidates, accountOverride, notes } = parsedBody.data;

      // Filter only selected candidates
      const selectedCandidates = candidates.filter((c) => c.selected);
      if (selectedCandidates.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_SELECTION',
            message: 'Please select at least one transaction to confirm.',
          },
        });
        return;
      }

      // Persist to /users/{uid}/transactions
      const { insertedIds, duplicatesSkipped } = await persistConfirmedTransactions(
        userId,
        documentId,
        selectedCandidates,
        accountOverride
      );

      // Update document status to 'confirmed'
      const existingDoc = await DatabaseService.getDocument(userId, documentId);
      if (existingDoc) {
        await DatabaseService.saveDocument(userId, {
          ...existingDoc,
          status: 'confirmed',
          confirmedTransactionIds: insertedIds,
          notes: notes || (existingDoc as any).notes || null,
          updatedAt: new Date().toISOString(),
        } as any);
      }

      res.json({
        success: true,
        confirmedCount: insertedIds.length,
        duplicatesSkipped,
        message: `Successfully imported ${insertedIds.length} transactions into your financial ledger.`,
      });
    } catch (err: any) {
      console.error('Error confirming import:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIRM_FAILED',
          message: 'Failed to import transactions. Please try again.',
        },
      });
    }
  }
);

/**
 * POST /api/imports/:id/reject
 * Reject document import without saving transactions.
 */
importsRouter.post(
  '/:id/reject',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid import ID' },
        });
        return;
      }

      const parsedBody = rejectImportSchema.safeParse(req.body);
      const reason = parsedBody.success ? parsedBody.data.reason : undefined;

      const existingDoc = await DatabaseService.getDocument(userId, parsedId.data.id);
      if (!existingDoc) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
        return;
      }

      await DatabaseService.saveDocument(userId, {
        ...existingDoc,
        status: 'rejected',
        notes: reason || 'Rejected by user during review',
        updatedAt: new Date().toISOString(),
      } as any);

      res.json({
        success: true,
        message: 'Document import rejected. No transactions were created.',
      });
    } catch (err: any) {
      console.error('Error rejecting import:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'REJECT_FAILED',
          message: 'Failed to reject import.',
        },
      });
    }
  }
);
