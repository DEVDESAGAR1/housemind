import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../dbService';
import {
  detectAgentIntent,
  buildSelectiveHouseholdContext,
  extractDeterministicFacts,
  generateDeterministicAgentReply,
  SelectiveHouseholdContext,
  DeterministicFacts,
} from './householdContextBuilder';
import {
  CopilotChatResponse,
  ChatMessage,
  HouseholdAgentIntent,
  AgentPriorityItem,
  AgentToolAuditRecord,
  AgentAuditMetadata,
  HouseholdMorningBrief,
  AgentActionProposal,
  AgentActionExecutionResult,
} from '../../../src/types';
import { ToolExecutor } from './toolExecutor';
import { HouseholdMorningBriefService } from './householdMorningBrief';
import { ActionExecutor } from './actionExecutor';
import { NotificationService } from '../notificationService';
import { AgentActivityService } from './agentActivityService';
import { getGeminiApiKey, getGeminiModel } from '../../config/secrets';

// Lazy-initialized Gemini Client
let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.warn('[AGENT ORCHESTRATOR] Warning: GEMINI_API_KEY is not set.');
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Builds the comprehensive grounded system prompt with strict safety guardrails
 */
function buildAgentSystemPrompt(
  context: SelectiveHouseholdContext,
  facts: DeterministicFacts,
  intent: HouseholdAgentIntent
): string {
  const { currency } = facts;

  const prioritySummary =
    facts.priorityItems.length > 0
      ? facts.priorityItems
          .map((p, idx) => `${idx + 1}. [${p.urgency.toUpperCase()}] ${p.title} (${p.category}): ${p.reason}`)
          .join('\n')
      : 'All monitored household systems operating within nominal parameters. Zero overdue tasks or critical alerts.';

  const expensesList =
    context.expenses.length > 0
      ? context.expenses
          .slice(0, 10)
          .map((e, idx) => `[Bill #${idx + 1}] "${e.title}", Amount: ${currency} ${e.amount}, Freq: ${e.frequency}, Due: ${e.dueDate || 'N/A'}, Status: ${e.paymentStatus || 'pending'}`)
          .join('\n')
      : 'No recurring expenses recorded.';

  const assetsList =
    context.assets.length > 0
      ? context.assets
          .slice(0, 8)
          .map((a, idx) => `[Asset #${idx + 1}] "${a.name}", Brand: ${a.brand || 'N/A'}, Installed: ${a.installDate || 'N/A'}, Status: ${a.currentStatus}, Lifespan: ${a.expectedLifespanYears || 10} yrs`)
          .join('\n')
      : 'No equipment or appliances recorded.';

  const tasksList =
    context.maintenances.length > 0
      ? context.maintenances
          .slice(0, 6)
          .map((m, idx) => `[Task #${idx + 1}] "${m.title}", Status: ${m.status}, Due: ${m.nextServiceDate || m.serviceDate || 'N/A'}, Est Cost: ${currency} ${m.cost || 0}`)
          .join('\n')
      : 'No maintenance tasks scheduled.';

  const loansList =
    context.loans.length > 0
      ? context.loans
          .map((l, idx) => `[Loan #${idx + 1}] "${l.loanName}", Type: ${l.loanType}, Balance: ${currency} ${l.outstandingAmount ?? l.principalAmount}, EMI: ${currency} ${l.emiAmount || 0}, Rate: ${l.interestRate}%`)
          .join('\n')
      : 'No active loans/mortgages.';

  const cardsList =
    context.creditCards.length > 0
      ? context.creditCards
          .map((c, idx) => `[Card #${idx + 1}] "${c.cardNickname}", Balance: ${currency} ${c.outstandingAmount || 0}, Limit: ${currency} ${c.creditLimit || 0}`)
          .join('\n')
      : 'No credit cards tracked.';

  const issuesList =
    context.issues && context.issues.length > 0
      ? context.issues
          .slice(0, 8)
          .map(
            (iss, idx) =>
              `[Issue #${idx + 1}] "${iss.title}", Status: ${iss.status}, Severity: ${iss.severity}${iss.safetyWarning ? ` (SAFETY HAZARD: ${iss.safetyWarning})` : ''}, Reported: ${iss.reportedAt ? iss.reportedAt.split('T')[0] : 'N/A'}${iss.resolution ? ` | Resolution: ${iss.resolution}` : ''}`
          )
          .join('\n')
      : 'No household issues or tickets recorded.';

  return `You are HouseMind Copilot, an expert, objective AI assistant specialized in home management, preventative maintenance, utilities, debt amortization, and financial efficiency for **${facts.homeName}**.

### DETERMINISTIC GROUND TRUTH (PRE-CALCULATED FACTS):
- Primary Residence: ${facts.homeName} (${facts.homeType})
- Total Monthly Burn Rate: ${currency} ${facts.totalBurnMonthly.toFixed(2)}/month
  (Expenses: ${currency} ${facts.expensesMonthly.toFixed(2)} + Utilities: ${currency} ${facts.utilitiesMonthly.toFixed(2)} + Loan EMIs: ${currency} ${facts.loansMonthly.toFixed(2)})
- Total Outstanding Debt: ${currency} ${facts.totalDebt.toLocaleString()}
  (Loans: ${currency} ${facts.loanDebt.toLocaleString()} + Credit Cards: ${currency} ${facts.creditCardDebt.toLocaleString()})
- Household Health Score: ${facts.isProvisional ? 'Unrated (Setup Required)' : `${facts.healthScore}/100 (${facts.healthLabel})`} (Data Completeness: ${facts.completenessScore}%)
- Monitored Inventory: ${facts.totalAssetsCount} appliances, ${facts.activeWarrantiesCount} active warranties, ${facts.upcomingTasksCount} scheduled maintenance tasks (${facts.overdueTasksCount} overdue).
- Open Household Tickets: ${facts.openIssuesCount} (${facts.criticalIssuesCount} critical/safety).

### RANKED ACTION PRIORITIES & IMMEDIATE NEEDS:
${prioritySummary}

### GROUNDED DOMAIN DATA:
--- EXPENSES & BILLS ---
${expensesList}

--- ASSETS & APPLIANCES ---
${assetsList}

--- HOUSEHOLD TICKETS & ISSUES ---
${issuesList}

--- MAINTENANCE SCHEDULE ---
${tasksList}

--- LOANS & MORTGAGES ---
${loansList}

--- CREDIT CARDS ---
${cardsList}

### CRITICAL AGENT POLICIES & SECURITY DIRECTIVES:
1. Authority & Sandboxing:
   - You operate in a strictly READ-ONLY advisory sandbox.
   - You MUST NOT execute database mutations, bank transfers, bill auto-pay, account wipes, code executions, or system commands.
   - If the user asks you to delete records or pay a bill, politely refuse and guide them to the manual UI controls.
2. Anti-Hallucination:
   - Answer questions truthfully and accurately based strictly on the provided household data.
   - Never invent non-existent appliances, fake bill amounts, or unverified interest rates.
   - If data is not present, explicitly state that it is not yet recorded in HouseMind.
3. Priority Reasoning & Unified Next Actions:
   - When asked "What should I do first?", "What should I deal with first?", or "What needs attention this week?", synthesize the unified household action recommendations (critical safety hazards > overdue payments/tasks > repair-vs-replace decisions > expiring warranties).
4. Currency & Formatting:
   - Always format monetary figures in ${currency} using clean markdown with bullet points.
5. Source Transparency & Grounded Evidence:
   - When answering cross-domain questions or explaining recommendations ("Why are you recommending this?", "What is costing me the most?"), explicitly cite the underlying evidence and records (e.g. 'Based on: [Asset: Refrigerator], [Warranty: Samsung Care], [Expense: Repair — 8,500]').
6. Suggestions:
   - At the very end of your response, output 2 or 3 brief follow-up questions the homeowner might want to ask, prefixed with "SUGGESTIONS:" on its own line followed by each suggestion on a bulleted line.`;
}

/**
 * Extracts suggested questions from AI response
 */
function extractSuggestedQuestions(aiReply: string): { reply: string; suggestedQuestions: string[] } {
  const suggestionSplit = aiReply.split(/SUGGESTIONS:/i);
  if (suggestionSplit.length < 2) {
    return { reply: aiReply.trim(), suggestedQuestions: [] };
  }

  const cleanReply = suggestionSplit[0].trim();
  const rawSuggestions = suggestionSplit[1].trim();

  const suggestedQuestions = rawSuggestions
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((line) => line.length > 5 && line.length < 120)
    .slice(0, 3);

  return { reply: cleanReply, suggestedQuestions };
}

export class HouseholdAgentOrchestrator {
  /**
   * Main agent entrypoint: Handles multi-turn grounded conversations with controlled tool execution and offline fallback.
   */
  public static async handleChat(
    userId: string,
    userMessage: string,
    existingConversationId?: string
  ): Promise<CopilotChatResponse> {
    const trimmedMessage = (userMessage || '').trim();
    const toolAuditRecords: AgentToolAuditRecord[] = [];

    // 1. Detect query intent
    const intent = detectAgentIntent(trimmedMessage);

    // 2. Selectively retrieve minimal household context
    const context = await buildSelectiveHouseholdContext(userId, intent);

    // 3. Extract pre-calculated deterministic facts
    const facts = extractDeterministicFacts(context);

    // 4. Resolve or initialize conversation ID
    const conversationId = existingConversationId || `conv_${crypto.randomUUID()}`;
    let conversation = await DatabaseService.getConversation(userId, conversationId);

    // 5. Load dialogue history (last 12 turns)
    const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (conversation && conversation.messages) {
      conversation.messages.slice(-12).forEach((m) => {
        history.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      });
    }

    // 6. Security guardrails & permission checks for adversarial/action execution input
    const lower = trimmedMessage.toLowerCase();
    const isDeleteIntent =
      lower.startsWith('delete ') ||
      lower.startsWith('wipe ') ||
      lower.includes('delete my') ||
      lower.includes('delete all') ||
      lower.includes('wipe all') ||
      lower.includes('drop database') ||
      lower.includes('erase all');
    const isPaymentIntent =
      lower.startsWith('pay ') ||
      lower.includes('pay my ') ||
      lower.includes('pay the ') ||
      lower.includes('pay this ') ||
      lower.includes('transfer funds') ||
      lower.includes('transfer $') ||
      lower.includes('transfer money') ||
      lower.includes('send $') ||
      lower.includes('send money') ||
      lower.includes('wire money') ||
      lower.includes('execute payment') ||
      lower.includes('make payment') ||
      lower.includes('process payment');

    let reply = '';
    let suggestedQuestions: string[] = [];
    let priorityItems: AgentPriorityItem[] | undefined = facts.priorityItems;
    let morningBriefResult: HouseholdMorningBrief | undefined;
    let actionProposalResult: AgentActionProposal | undefined;

    // Check for natural action execution requests
    const isNotificationAction =
      (lower.includes('notification') || lower.includes('alert')) &&
      (lower.includes('take care') || lower.includes('read') || lower.includes('clear') || lower.includes('dismiss'));

    const isMaintenanceAction =
      (lower.includes('maintenance') || lower.includes('task') || lower.includes('reminder') || lower.includes('filter') || lower.includes('cleaning')) &&
      (lower.includes('complete') || lower.includes('finish') || lower.includes('done') || lower.includes('mark complete'));

    const isSimpleGreeting =
      intent === 'GREETING' ||
      /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|thanks|thank you)[\s!.]*$/i.test(trimmedMessage);

    if (isSimpleGreeting) {
      reply = "Hi! 👋 I'm HouseMind Copilot. What would you like to look at today?";
      suggestedQuestions = [
        'How is my household doing?',
        'What needs my attention today?',
        'Give me my morning brief',
        'What bills are due this week?',
      ];
    } else if (intent === 'MORNING_BRIEF') {
      const brief = await HouseholdMorningBriefService.generateMorningBrief(userId);
      morningBriefResult = brief;
      reply = brief.synthesizedNarrative;
      if (brief.agentAudit?.toolsInvoked) {
        toolAuditRecords.push(...brief.agentAudit.toolsInvoked);
      }

      AgentActivityService.recordActivity(userId, {
        eventType: 'INVESTIGATED',
        title: 'Morning Brief Generated',
        description: `Investigated household health, obligations, and maintenance. ${brief.itemsNeedingAttention.length} item(s) prioritized.`,
        status: 'info',
        targetDomain: 'morning_brief',
      });

      suggestedQuestions = [
        'What should I do first?',
        'Show my upcoming financial obligations',
        'How is my household health calculated?',
      ];
      priorityItems = brief.itemsNeedingAttention.map((i) => ({
        id: i.id,
        title: i.title,
        category: (i.category as any) || 'general',
        urgency: (i.urgency === 'critical' ? 'urgent' : i.urgency === 'due_soon' ? 'soon' : 'urgent') as any,
        reason: i.reason,
        actionTab: i.actionTab,
        dueDate: i.dueDate,
        amount: i.amount,
      }));
    } else if (isDeleteIntent) {
      // Execute denied tool via Permission Engine to capture audit
      const deniedExec = await ToolExecutor.executeTool(userId, 'deleteHouseholdRecords');
      toolAuditRecords.push(deniedExec.auditRecord);

      AgentActivityService.recordActivity(userId, {
        eventType: 'ACTION_DENIED',
        title: 'Autonomous Deletion Denied',
        description: 'Record deletion or data wipe requested and denied by policy.',
        status: 'warning',
      });

      reply = `**Action Policy:** As HouseMind Copilot, I operate strictly in an advisory sandbox and cannot autonomously delete or wipe household records.

To manage or delete your data, please go to **Profile / Settings → Data Controls & Exports** to export backups or use the typed confirmation modal.`;
      suggestedQuestions = ['What data is stored in my HouseMind account?', 'How do I export my financial ledger to CSV?'];
    } else if (isPaymentIntent) {
      // Execute denied tool via Permission Engine to capture audit
      const deniedExec = await ToolExecutor.executeTool(userId, 'executeBillPayment');
      toolAuditRecords.push(deniedExec.auditRecord);

      AgentActivityService.recordActivity(userId, {
        eventType: 'ACTION_DENIED',
        title: 'Direct Payment / Transfer Denied',
        description: 'Payment execution or money transfer requested and denied by financial safety policy.',
        status: 'warning',
      });

      reply = `**Financial Security Notice:** Copilot cannot execute bank transfers or initiate payments. All financial operations in HouseMind are informational and record-keeping only.

To log a bill payment, open the **Utilities & Debts** or **Expenses** tab and toggle payment status.`;
      suggestedQuestions = ['Which bills or debt payments are upcoming?', 'What is our total monthly burn rate?'];
    } else if (isNotificationAction) {
      const notifsRes = await NotificationService.getNotifications(userId);
      const unread = notifsRes.notifications.filter((n) => !n.isRead);

      if (unread.length > 0) {
        const targetNotif = unread[0];
        const proposal = await ActionExecutor.proposeAction(userId, 'markNotificationRead', {
          title: `Mark "${targetNotif.title}" as Read`,
          description: `Archive the alert "${targetNotif.title}" from active notifications.`,
          targetEntityId: targetNotif.id,
          targetEntityType: 'notification',
          targetEntityName: targetNotif.title,
          expectedOutcome: 'Notification marked as read in Notification Center.',
          riskLevel: 'low',
        });
        actionProposalResult = proposal;

        reply = `I identified the unread notification: **${targetNotif.title}**.

Would you like me to mark it as read? Please review the action approval card below to approve or cancel.`;
        suggestedQuestions = ['Show my remaining unread alerts', 'Give me my morning brief'];
      } else {
        reply = `You have no unread notifications or alerts in your inbox right now. Everything is up to date!`;
        suggestedQuestions = ['What needs my attention today?', 'How is my household health calculated?'];
      }
    } else if (isMaintenanceAction) {
      const tasks = await DatabaseService.listMaintenances(userId);
      const pendingTasks = tasks.filter((t) => t.status !== 'completed');

      if (pendingTasks.length > 0) {
        const words = lower.split(/\s+/);
        let matchedTask = pendingTasks.find((t) => words.some((w) => w.length > 3 && t.title.toLowerCase().includes(w))) || pendingTasks[0];

        const proposal = await ActionExecutor.proposeAction(userId, 'completeMaintenanceTask', {
          title: `Mark "${matchedTask.title}" as Completed`,
          description: `Set status of "${matchedTask.title}" to completed.`,
          targetEntityId: matchedTask.id,
          targetEntityType: 'maintenance_task',
          targetEntityName: matchedTask.title,
          expectedOutcome: 'Task status updated to completed; scheduled next service date recalculated.',
          riskLevel: 'low',
        });
        actionProposalResult = proposal;

        reply = `I found the maintenance task: **${matchedTask.title}**.

Would you like me to mark it as completed? Please confirm your approval in the card below.`;
        suggestedQuestions = ['Show my scheduled maintenance', 'What needs my attention today?'];
      } else {
        reply = `You have no pending or overdue maintenance tasks at this time. All scheduled upkeep is completed!`;
        suggestedQuestions = ['Give me my morning brief', 'What is our total monthly burn rate?'];
      }
    } else {
      // 7. Execute relevant controlled read-only tools based on intent
      switch (intent) {
        case 'HOUSEHOLD_HEALTH': {
          const res = await ToolExecutor.executeTool(userId, 'getHouseholdHealth');
          toolAuditRecords.push(res.auditRecord);
          break;
        }
        case 'NEEDS_ATTENTION': {
          const [maintRes, obsRes, notifRes] = await Promise.all([
            ToolExecutor.executeTool(userId, 'getOverdueMaintenance'),
            ToolExecutor.executeTool(userId, 'getUpcomingObligations', { days: 14 }),
            ToolExecutor.executeTool(userId, 'getRecentNotifications', { unreadOnly: true }),
          ]);
          toolAuditRecords.push(maintRes.auditRecord, obsRes.auditRecord, notifRes.auditRecord);
          break;
        }
        case 'FINANCES_BILLS_DEBTS': {
          const res = await ToolExecutor.executeTool(userId, 'getFinancialSummary');
          toolAuditRecords.push(res.auditRecord);
          break;
        }
        case 'MAINTENANCE_WARRANTIES': {
          const [maintRes, warRes] = await Promise.all([
            ToolExecutor.executeTool(userId, 'getOverdueMaintenance'),
            ToolExecutor.executeTool(userId, 'getExpiringWarrantiesAndDocuments', { daysAhead: 60 }),
          ]);
          toolAuditRecords.push(maintRes.auditRecord, warRes.auditRecord);
          break;
        }
        case 'CALENDAR_SCHEDULE': {
          const res = await ToolExecutor.executeTool(userId, 'getUpcomingObligations', { days: 30 });
          toolAuditRecords.push(res.auditRecord);
          break;
        }
        case 'NOTIFICATIONS_ALERTS': {
          const res = await ToolExecutor.executeTool(userId, 'getRecentNotifications');
          toolAuditRecords.push(res.auditRecord);
          break;
        }
        case 'COMPREHENSIVE_DIAGNOSTIC': {
          const [healthRes, finRes, maintRes] = await Promise.all([
            ToolExecutor.executeTool(userId, 'getHouseholdHealth'),
            ToolExecutor.executeTool(userId, 'getFinancialSummary'),
            ToolExecutor.executeTool(userId, 'getOverdueMaintenance'),
          ]);
          toolAuditRecords.push(healthRes.auditRecord, finRes.auditRecord, maintRes.auditRecord);
          break;
        }
        default:
          // No tools required
          break;
      }

      // 8. Invoke Gemini with grounded context
      const systemInstruction = buildAgentSystemPrompt(context, facts, intent);
      const modelName = getGeminiModel('gemini-2.5-flash');
      const client = getGeminiClient();

      try {
        const contents = [
          ...history,
          {
            role: 'user',
            parts: [{ text: trimmedMessage }],
          },
        ];

        const generatePromise = client.models.generateContent({
          model: modelName,
          contents: contents as any,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI response timeout (exceeded 3.5s)')), 3500)
        );

        const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
        const rawText = response.text || '';

        if (rawText && rawText.trim().length > 0) {
          const parsed = extractSuggestedQuestions(rawText);
          reply = parsed.reply;
          suggestedQuestions = parsed.suggestedQuestions;
        } else {
          throw new Error('Empty Gemini response received');
        }
      } catch (geminiError: any) {
        console.warn('[AGENT ORCHESTRATOR] Upstream Gemini notice, falling back to deterministic reasoning', {
          userId,
          intent,
          message: geminiError?.message || String(geminiError),
        });

        // Graceful deterministic fallback
        const fallback = generateDeterministicAgentReply(context, intent, trimmedMessage);
        reply = fallback.reply;
        suggestedQuestions = fallback.suggestedQuestions;
        priorityItems = fallback.priorityItems ?? facts.priorityItems;
      }
    }

    // 9. Persist User Message & Agent Reply to conversation thread
    const newMessages: ChatMessage[] = conversation ? [...conversation.messages] : [];
    const timestamp = new Date().toISOString();

    newMessages.push({
      id: `msg_${crypto.randomUUID()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp,
    });

    newMessages.push({
      id: `msg_${crypto.randomUUID()}`,
      role: 'assistant',
      content: reply,
      timestamp,
      suggestedQuestions,
    });

    // Derive concise conversation title if new
    let conversationTitle = conversation?.title;
    if (!conversationTitle || conversationTitle === 'New Conversation') {
      conversationTitle =
        trimmedMessage.length > 36 ? `${trimmedMessage.substring(0, 36)}...` : trimmedMessage;
    }

    await DatabaseService.saveConversation(userId, {
      id: conversationId,
      userId,
      title: conversationTitle,
      messages: newMessages,
      createdAt: conversation?.createdAt || timestamp,
      updatedAt: timestamp,
      lastMessage: reply.substring(0, 100),
    });

    const agentAudit: AgentAuditMetadata = {
      intent,
      toolsInvoked: toolAuditRecords,
      authenticatedTenant: `tenant_${userId.substring(0, 8)}`,
      timestamp,
    };

    return {
      conversationId,
      reply,
      suggestedQuestions,
      groundedSummary: {
        profileLoaded: !!context.profile,
        expensesCount: context.expenses.length,
        assetsCount: context.assets.length,
        healthScore: facts.isProvisional ? undefined : facts.healthScore,
        intent,
        domainsConsulted: context.domainsConsulted,
      },
      agentActionPlan: {
        intent,
        priorityItems: priorityItems && priorityItems.length > 0 ? priorityItems : undefined,
        reasoningBrief: `Intent: ${intent} | Domains Consulted: ${context.domainsConsulted.join(', ')}`,
      },
      agentAudit,
      morningBrief: morningBriefResult,
      actionProposal: actionProposalResult,
    };
  }
}

