import { DatabaseService } from '../dbService';
import { HouseholdMemoryItem, HouseholdMemoryCategory } from '../../../src/types';

// Sensitive keywords to prevent credentials, secrets, or financial account details from being stored in memory
const SENSITIVE_KEYWORD_REGEX =
  /(password|secret|api[_-]?key|auth[_-]?token|bearer|private[_-]?key|seed[_-]?phrase|cvv|cvc|card[_-]?number|credit[_-]?card|bank[_-]?account|routing[_-]?number|ssn|social[_-]?security|pan[_-]?card|aadhaar|pin|passcode)/i;

// Regex patterns for payment cards, SSN, PAN, and Aadhaar
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{13,19}\b/;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/;
const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/;

export class HouseholdMemoryService {
  /**
   * Checks whether a key or value contains sensitive information that must not be retained.
   */
  public static isSensitive(key: string, value: any): { sensitive: boolean; reason?: string } {
    const keyStr = String(key || '');
    if (SENSITIVE_KEYWORD_REGEX.test(keyStr)) {
      return {
        sensitive: true,
        reason: `Key "${keyStr}" contains sensitive credential, token, or financial identifier keywords.`,
      };
    }

    const valStr = typeof value === 'string' ? value : JSON.stringify(value || '');

    if (SENSITIVE_KEYWORD_REGEX.test(valStr)) {
      return {
        sensitive: true,
        reason: 'Value contains sensitive credential, token, or secret keywords.',
      };
    }

    if (CREDIT_CARD_REGEX.test(valStr)) {
      return {
        sensitive: true,
        reason: 'Value appears to contain payment card or account digits.',
      };
    }

    if (SSN_REGEX.test(valStr)) {
      return {
        sensitive: true,
        reason: 'Value contains Social Security Number pattern.',
      };
    }

    if (PAN_REGEX.test(valStr)) {
      return {
        sensitive: true,
        reason: 'Value contains National Tax ID / PAN pattern.',
      };
    }

    if (AADHAAR_REGEX.test(valStr)) {
      return {
        sensitive: true,
        reason: 'Value contains National Identity / Aadhaar pattern.',
      };
    }

    return { sensitive: false };
  }

  /**
   * Validates size bounds for keys and values.
   */
  public static validateBounds(key: string, value: any): { valid: boolean; reason?: string } {
    if (!key || key.trim().length === 0) {
      return { valid: false, reason: 'Memory key cannot be empty.' };
    }
    if (key.length > 100) {
      return { valid: false, reason: 'Memory key exceeds maximum allowed length of 100 characters.' };
    }

    if (typeof value === 'string') {
      if (value.length > 500) {
        return { valid: false, reason: 'Memory string value exceeds maximum allowed length of 500 characters.' };
      }
    } else if (value !== null && typeof value === 'object') {
      const serialized = JSON.stringify(value);
      if (serialized.length > 2048) {
        return { valid: false, reason: 'Memory structured object value exceeds maximum allowed size of 2KB.' };
      }
    }

    return { valid: true };
  }

  /**
   * Retrieves tenant-isolated memories.
   */
  public static async getMemories(
    userId: string,
    confirmedOnly: boolean = false
  ): Promise<HouseholdMemoryItem[]> {
    if (!userId) return [];
    return DatabaseService.listMemories(userId, confirmedOnly);
  }

  /**
   * Retrieves a specific memory item by ID with strict tenant check.
   */
  public static async getMemory(userId: string, id: string): Promise<HouseholdMemoryItem | null> {
    if (!userId || !id) return null;
    const item = await DatabaseService.getMemory(userId, id);
    if (!item || item.userId !== userId) {
      return null;
    }
    return item;
  }

  /**
   * Adds a new confirmed or proposed household memory item.
   */
  public static async addMemory(
    userId: string,
    data: {
      category: HouseholdMemoryCategory;
      key: string;
      value?: any;
      source?: 'user_explicit' | 'app_preference' | 'confirmed_suggestion';
      confirmed?: boolean;
    }
  ): Promise<HouseholdMemoryItem> {
    if (!userId) {
      throw new Error('Authenticated userId is required to create household memory.');
    }

    const { key, value, category, source = 'user_explicit', confirmed = true } = data;

    // Safety checks
    const sensCheck = this.isSensitive(key, value);
    if (sensCheck.sensitive) {
      throw new Error(`Memory Rejected: ${sensCheck.reason}`);
    }

    const boundsCheck = this.validateBounds(key, value);
    if (!boundsCheck.valid) {
      throw new Error(`Memory Validation Error: ${boundsCheck.reason}`);
    }

    return DatabaseService.createMemory(userId, {
      category,
      key: key.trim(),
      value,
      source,
      confirmed,
    });
  }

  /**
   * Updates an existing memory item.
   */
  public static async updateMemory(
    userId: string,
    id: string,
    updates: Partial<HouseholdMemoryItem>
  ): Promise<HouseholdMemoryItem | null> {
    const existing = await this.getMemory(userId, id);
    if (!existing) {
      return null;
    }

    const newKey = updates.key !== undefined ? updates.key : existing.key;
    const newValue = updates.value !== undefined ? updates.value : existing.value;

    const sensCheck = this.isSensitive(newKey, newValue);
    if (sensCheck.sensitive) {
      throw new Error(`Memory Rejected: ${sensCheck.reason}`);
    }

    const boundsCheck = this.validateBounds(newKey, newValue);
    if (!boundsCheck.valid) {
      throw new Error(`Memory Validation Error: ${boundsCheck.reason}`);
    }

    return DatabaseService.updateMemory(userId, id, updates);
  }

  /**
   * Confirms a proposed memory item.
   */
  public static async confirmMemory(userId: string, id: string): Promise<HouseholdMemoryItem | null> {
    const existing = await this.getMemory(userId, id);
    if (!existing) return null;
    return DatabaseService.confirmMemory(userId, id);
  }

  /**
   * Deletes a memory item.
   */
  public static async deleteMemory(userId: string, id: string): Promise<boolean> {
    const existing = await this.getMemory(userId, id);
    if (!existing) return false;
    return DatabaseService.deleteMemory(userId, id);
  }

  /**
   * Conflict resolver: Authoritative Live Data Wins Over Stored Memory.
   * If an authoritative field exists in active household profile or records, returns the authoritative value.
   */
  public static resolveEffectiveValue(
    key: string,
    memoryValue: any,
    authoritativeValue: any
  ): { value: any; source: 'authoritative_live' | 'confirmed_memory' } {
    if (authoritativeValue !== undefined && authoritativeValue !== null && authoritativeValue !== '') {
      return {
        value: authoritativeValue,
        source: 'authoritative_live',
      };
    }
    return {
      value: memoryValue,
      source: 'confirmed_memory',
    };
  }
}
