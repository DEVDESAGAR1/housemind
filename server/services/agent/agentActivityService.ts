import crypto from 'crypto';
import {
  AgentActivityItem,
  AgentActivityTimelineResponse,
  AgentActivityEventType,
  AgentActivityStatus,
} from '../../../src/types';

// In-memory per-tenant isolated activity timeline storage
const activityStore = new Map<string, AgentActivityItem[]>();

function getUserActivityList(userId: string): AgentActivityItem[] {
  if (!activityStore.has(userId)) {
    activityStore.set(userId, []);
  }
  return activityStore.get(userId)!;
}

export class AgentActivityService {
  /**
   * Records a new activity timeline event for the authenticated tenant.
   */
  public static recordActivity(
    userId: string,
    event: Omit<AgentActivityItem, 'id' | 'userId' | 'timestamp'> & { timestamp?: string }
  ): AgentActivityItem {
    const list = getUserActivityList(userId);
    const id = `act_item_${crypto.randomUUID()}`;
    const timestamp = event.timestamp || new Date().toISOString();

    const activityItem: AgentActivityItem = {
      id,
      userId,
      timestamp,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      actionType: event.actionType,
      actionId: event.actionId,
      targetDomain: event.targetDomain,
      targetEntityId: event.targetEntityId,
      targetEntityName: event.targetEntityName,
      status: event.status,
      verification: event.verification,
      metadata: event.metadata,
    };

    // Prepend to maintain newest first
    list.unshift(activityItem);

    // Keep memory bounded to most recent 200 items per household
    if (list.length > 200) {
      list.length = 200;
    }

    return activityItem;
  }

  /**
   * Retrieves bounded and paginated activity timeline for the authenticated tenant.
   */
  public static getActivityTimeline(
    userId: string,
    options: { limit?: number; offset?: number; eventType?: AgentActivityEventType | string } = {}
  ): AgentActivityTimelineResponse {
    const list = getUserActivityList(userId);
    let filtered = list;

    if (options.eventType) {
      filtered = filtered.filter((item) => item.eventType === options.eventType);
    }

    const total = filtered.length;
    const offset = Math.max(0, options.offset || 0);
    const rawLimit = options.limit !== undefined ? options.limit : 50;
    const limit = Math.max(1, Math.min(100, rawLimit));

    const paginated = filtered.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      activities: paginated,
    };
  }

  /**
   * Test helper to clear activities
   */
  public static clearActivityForTest(userId?: string): void {
    if (userId) {
      activityStore.delete(userId);
    } else {
      activityStore.clear();
    }
  }
}
