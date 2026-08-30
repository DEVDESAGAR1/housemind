import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createTransactionSchema,
  updateTransactionSchema,
  idParamSchema,
} from '../schemas';
import {
  getUserTransactions,
  computeFinancialSummary,
  generateTransactionFingerprint,
} from '../services/transactionService';
import { DatabaseService } from '../services/dbService';
import { FinancialTransaction } from '../../src/types';

export const transactionsRouter = Router();

/**
 * GET /api/transactions/summary
 * Compute deterministic financial summary (Credits, Debits, Net Cash Flow, Savings Rate).
 */
transactionsRouter.get(
  '/summary',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const currency = (req.query.currency as string) || 'USD';
      const summary = await computeFinancialSummary(userId, currency);
      res.json({ success: true, summary });
    } catch (err: any) {
      console.error('Error computing financial summary:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUMMARY_FAILED',
          message: 'Failed to calculate financial summary.',
        },
      });
    }
  }
);

/**
 * GET /api/transactions
 * Retrieve filtered list of transactions.
 */
transactionsRouter.get(
  '/',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { type, category, account, startDate, endDate, search, limit, offset } = req.query;

      const transactions = await getUserTransactions(userId, {
        type: type as string,
        category: category as string,
        account: account as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({ success: true, transactions, count: transactions.length });
    } catch (err: any) {
      console.error('Error retrieving transactions:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSACTIONS_FETCH_FAILED',
          message: 'Failed to retrieve transactions.',
        },
      });
    }
  }
);

/**
 * GET /api/transactions/:id
 * Retrieve a specific transaction.
 */
transactionsRouter.get(
  '/:id',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid transaction ID' },
        });
        return;
      }

      const tx = await DatabaseService.getTransaction(userId, parsedId.data.id);
      if (!tx) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        });
        return;
      }

      res.json({
        success: true,
        transaction: tx,
      });
    } catch (err: any) {
      console.error('Error fetching transaction:', err);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to retrieve transaction' },
      });
    }
  }
);

/**
 * POST /api/transactions
 * Create a new manual transaction.
 */
transactionsRouter.post(
  '/',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsed = createTransactionSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid transaction data',
            details: parsed.error.issues as any,
          },
        });
        return;
      }

      const data = parsed.data;
      const account = (data.account || 'Main Checking').trim();
      const fingerprint = generateTransactionFingerprint(
        userId,
        account,
        data.date,
        data.amount,
        data.type,
        data.description,
        data.reference
      );

      const transaction = await DatabaseService.createTransaction(userId, {
        ...data,
        account,
        source: 'manual',
        confidence: 1.0,
        fingerprint,
        isSalary: data.isSalary || false,
        isRecurring: data.isRecurring || false,
      });

      res.status(201).json({
        success: true,
        transaction,
        message: 'Transaction saved successfully',
      });
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create transaction',
        },
      });
    }
  }
);

/**
 * PUT /api/transactions/:id
 * Update an existing transaction.
 */
transactionsRouter.put(
  '/:id',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid transaction ID' },
        });
        return;
      }

      const parsedBody = updateTransactionSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsedBody.error.issues[0]?.message || 'Invalid update payload',
            details: parsedBody.error.issues as any,
          },
        });
        return;
      }

      const existingData = await DatabaseService.getTransaction(userId, parsedId.data.id);
      if (!existingData) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        });
        return;
      }

      const updateData = {
        ...parsedBody.data,
      };

      // Recalculate fingerprint if key attributes changed
      if (
        updateData.date ||
        updateData.amount !== undefined ||
        updateData.type ||
        updateData.description ||
        updateData.account
      ) {
        const finalDate = updateData.date || existingData.date;
        const finalAmount =
          updateData.amount !== undefined ? updateData.amount : existingData.amount;
        const finalType = updateData.type || existingData.type;
        const finalDesc = updateData.description || existingData.description;
        const finalAccount = updateData.account || existingData.account || 'Main Checking';
        const finalRef =
          updateData.reference !== undefined ? updateData.reference : existingData.reference;

        (updateData as any).fingerprint = generateTransactionFingerprint(
          userId,
          finalAccount,
          finalDate,
          finalAmount,
          finalType,
          finalDesc,
          finalRef
        );
      }

      const updated = await DatabaseService.updateTransaction(userId, parsedId.data.id, updateData);

      res.json({
        success: true,
        transaction: updated,
        message: 'Transaction updated successfully',
      });
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update transaction' },
      });
    }
  }
);

/**
 * DELETE /api/transactions/:id
 * Delete a transaction.
 */
transactionsRouter.delete(
  '/:id',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsedId = idParamSchema.safeParse(req.params);
      if (!parsedId.success) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid transaction ID' },
        });
        return;
      }

      const deleted = await DatabaseService.deleteTransaction(userId, parsedId.data.id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        });
        return;
      }

      res.json({ success: true, message: 'Transaction deleted' });
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      res.status(500).json({
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Failed to delete transaction' },
      });
    }
  }
);
