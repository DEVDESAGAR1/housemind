import { GoogleGenAI } from '@google/genai';
import { DatabaseService, getOrCreateUserStore } from './dbService';
import { evaluateIssueSafety } from './issueSafetyService';
import {
  HouseholdIssue,
  HouseholdIssueSeverity,
  HouseholdIssueStatus,
  HomeAsset,
  WarrantyPolicy,
  MaintenanceTask,
  HouseholdDocument,
  IssueIntelligenceReport,
  PossibleRelatedIssue,
  RecurringFailureSignal,
  IssueWarrantyIntelligence,
  IssueMaintenanceIntelligence,
  RecommendedNextStep,
  ResolutionChecklistItem,
  StructuredResolutionSummary,
  WarrantyCoverageStatus,
} from '../../src/types';

let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

const DEFAULT_CHECKLIST_ITEMS: Array<{ id: string; label: string }> = [
  { id: 'diagnosis_recorded', label: 'Diagnosis & symptoms recorded' },
  { id: 'warranty_checked', label: 'Warranty coverage checked' },
  { id: 'service_scheduled', label: 'Service appointment or technician scheduled' },
  { id: 'repair_completed', label: 'Repair or mitigation completed' },
  { id: 'cost_recorded', label: 'Actual cost recorded' },
  { id: 'document_attached', label: 'Receipt, invoice, or photos attached' },
  { id: 'resolution_notes_recorded', label: 'Resolution notes & root cause documented' },
  { id: 'user_verified', label: 'Homeowner verified repair is holding' },
];

const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  cooling: ['cooling', 'temperature', 'warm', 'cold', 'freezing', 'compressor', 'ice', 'frost', 'thermostat'],
  leak: ['leak', 'leaking', 'drip', 'water', 'moisture', 'pooling', 'overflow', 'pipe', 'drain'],
  electrical: ['power', 'tripping', 'breaker', 'spark', 'outlet', 'wiring', 'surge', 'flickering', 'buzzing'],
  noise: ['noise', 'loud', 'vibrating', 'grinding', 'squealing', 'rattling', 'clicking', 'humming'],
  heating: ['heat', 'heating', 'furnace', 'boiler', 'burner', 'radiator', 'igniter'],
  drainage: ['clog', 'clogged', 'slow drain', 'backup', 'odor', 'sewer', 'sewage'],
  mechanical: ['jammed', 'stuck', 'belt', 'motor', 'gears', 'bearing', 'door', 'seal'],
};

export class IssueIntelligenceService {
  /**
   * Generates a comprehensive, deterministic Issue Intelligence Report
   */
  static async analyzeIssue(
    userId: string,
    issueId: string
  ): Promise<IssueIntelligenceReport> {
    const store = getOrCreateUserStore(userId);
    const issue = store.issues.get(issueId);

    if (!issue || issue.userId !== userId) {
      const error: any = new Error('Issue not found or unauthorized.');
      error.statusCode = 404;
      throw error;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const reportedDate = issue.reportedAt ? issue.reportedAt.slice(0, 10) : todayStr;
    const reportedTime = new Date(issue.reportedAt || issue.createdAt || Date.now()).getTime();
    const ageInDays = Math.max(0, Math.floor((Date.now() - reportedTime) / (1000 * 60 * 60 * 24)));

    const isResolvedOrClosed =
      issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed' || issue.status === 'cancelled';

    const isOverdue =
      !isResolvedOrClosed &&
      ((Boolean(issue.dueDate) && (issue.dueDate as string) < todayStr) ||
        (Boolean(issue.scheduledDate) && (issue.scheduledDate as string) < todayStr));

    const isAging = !isResolvedOrClosed && ageInDays > 14;

    // 1. Linked Entities
    const linkedAsset: HomeAsset | undefined = issue.assetId ? store.assets.get(issue.assetId) : undefined;
    const linkedProperty = issue.propertyId ? store.properties.get(issue.propertyId) : undefined;
    const linkedRoom = issue.roomId ? store.rooms.get(issue.roomId) : undefined;

    // 2. Deterministic Safety Evaluation
    const safetyResult = evaluateIssueSafety(
      issue.title,
      issue.description,
      `${issue.notes || ''} ${issue.rootCause || ''}`
    );

    let escalationAdvice: string | undefined;
    if (safetyResult.isSafetyRisk) {
      if (safetyResult.hazardType === 'Gas Leak') {
        escalationAdvice = 'Evacuate immediately. Do NOT touch light switches or open flames. Call utility or emergency services from a safe distance.';
      } else if (safetyResult.hazardType === 'Fire / Smoke Hazard') {
        escalationAdvice = 'Cut power to affected breaker if safely accessible. Evacuate if smoke is persistent. Contact fire services immediately.';
      } else if (safetyResult.hazardType === 'Electrical Hazard') {
        escalationAdvice = 'Do NOT touch live components or standing water. Switch off the relevant circuit breaker and hire a licensed master electrician.';
      } else if (safetyResult.hazardType === 'Dangerous Vehicle Condition') {
        escalationAdvice = 'Do NOT operate vehicle on public roadways. Arrange for a licensed mechanic inspection or flatbed tow.';
      } else if (safetyResult.hazardType === 'Major Water Inundation / Pipe Burst') {
        escalationAdvice = 'Immediately turn off main water shutoff valve. Disconnect electrical circuits in flooded area.';
      } else {
        escalationAdvice = 'Avoid direct DIY interference with hazardous structural or high-voltage components. Engage a certified professional.';
      }
    }

    // 3. Warranty Intelligence
    const warrantyIntelligence = this.evaluateWarranty(userId, issue, linkedAsset);

    // 4. Maintenance Intelligence
    const maintenanceIntelligence = this.evaluateMaintenance(userId, issue, linkedAsset);

    // 5. Related / Duplicate Issues
    const relatedIssues = this.detectRelatedIssues(userId, issue, linkedAsset);

    // 6. Recurring Failure Intelligence
    const recurringSignal = this.evaluateRecurrence(userId, issue, linkedAsset);

    // 7. Recommended Next Steps
    const recommendedNextSteps = this.generateRecommendedNextSteps(
      issue,
      safetyResult,
      warrantyIntelligence,
      maintenanceIntelligence,
      recurringSignal
    );

    // 8. Resolution Checklist
    const checklist = this.buildResolutionChecklist(issue);

    // 9. Structured Resolution Summary (for resolved/verified issues)
    let resolutionSummary: StructuredResolutionSummary | undefined;
    if (isResolvedOrClosed) {
      resolutionSummary = this.buildResolutionSummary(
        issue,
        linkedAsset,
        linkedProperty?.name,
        linkedRoom?.name,
        warrantyIntelligence,
        maintenanceIntelligence
      );
    }

    // 10. Why It Matters
    const whyItMatters = this.generateWhyItMatters(
      issue,
      safetyResult,
      warrantyIntelligence,
      recurringSignal,
      isOverdue,
      linkedAsset
    );

    const report: IssueIntelligenceReport = {
      issueId: issue.id,
      title: issue.title,
      severity: issue.severity,
      status: issue.status,
      ageInDays,
      isOverdue,
      isAging,
      whyItMatters,
      safetyClassification: {
        isSafetyRisk: safetyResult.isSafetyRisk,
        hazardType: safetyResult.hazardType,
        safetyWarning: safetyResult.safetyWarning || issue.safetyWarning,
        escalationAdvice,
      },
      linkedAsset: linkedAsset
        ? {
            id: linkedAsset.id,
            name: linkedAsset.name,
            brand: linkedAsset.brand,
            model: linkedAsset.model,
            category: linkedAsset.category,
          }
        : undefined,
      linkedProperty: linkedProperty ? { id: linkedProperty.id, name: linkedProperty.name } : undefined,
      linkedRoom: linkedRoom ? { id: linkedRoom.id, name: linkedRoom.name } : undefined,
      relatedIssues,
      recurringSignal,
      warrantyIntelligence,
      maintenanceIntelligence,
      recommendedNextSteps,
      checklist,
      resolutionSummary,
      generatedAt: new Date().toISOString(),
    };

    return report;
  }

  /**
   * Deterministic Warranty Evaluation
   */
  static evaluateWarranty(
    userId: string,
    issue: HouseholdIssue,
    linkedAsset?: HomeAsset
  ): IssueWarrantyIntelligence {
    const store = getOrCreateUserStore(userId);
    const warranties = Array.from(store.warranties.values());

    let policy: WarrantyPolicy | undefined;

    if (issue.warrantyId) {
      policy = store.warranties.get(issue.warrantyId);
    }

    if (!policy && linkedAsset) {
      policy = warranties.find((w) => w.assetId === linkedAsset.id);
    }

    if (!policy) {
      return {
        status: 'no_warranty',
        statusLabel: 'No Warranty Found',
        isExpired: false,
        explanation: linkedAsset
          ? `No active or historical warranty record registered for ${linkedAsset.name}.`
          : 'No asset or warranty policy linked to this issue.',
      };
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const hasDates = Boolean(policy.startDate || policy.endDate);
    const isExpired = Boolean(policy.endDate && policy.endDate < todayIso);
    let daysUntilExpiration: number | undefined;

    if (policy.endDate) {
      const diffMs = new Date(policy.endDate).getTime() - new Date(todayIso).getTime();
      daysUntilExpiration = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    let status: WarrantyCoverageStatus = 'possibly_covered';
    let statusLabel = 'Possibly Covered';
    let explanation = '';

    if (!hasDates && !policy.coverageDetails) {
      status = 'incomplete';
      statusLabel = 'Warranty Information Incomplete';
      explanation = `Warranty record for ${policy.provider || 'Provider'} exists, but lacks clear validity dates or coverage terms. Verify original policy document.`;
    } else if (isExpired) {
      status = 'expired';
      statusLabel = 'Warranty Expired';
      explanation = `Warranty expired on ${policy.endDate}. Standard repairs will be out-of-pocket unless an extended warranty or manufacturer recall applies.`;
    } else if (policy.endDate && policy.endDate >= todayIso) {
      status = 'covered';
      statusLabel = 'Active Coverage';
      explanation = `Active coverage under ${policy.provider || 'Provider'} until ${policy.endDate} (${daysUntilExpiration} days remaining). Check claim terms before paying out-of-pocket.`;
    } else {
      status = 'possibly_covered';
      statusLabel = 'Possibly Covered';
      explanation = `Protection policy registered under ${policy.provider || 'Provider'}. Review specific coverage terms and deductibles for this component.`;
    }

    let documentName: string | undefined;
    if (policy.documentId) {
      const doc = store.documents.get(policy.documentId);
      documentName = doc?.fileName || doc?.title;
    }

    return {
      status,
      statusLabel,
      warrantyId: policy.id,
      provider: policy.provider,
      policyNumber: policy.policyNumber,
      startDate: policy.startDate,
      endDate: policy.endDate,
      isExpired,
      daysUntilExpiration,
      documentId: policy.documentId,
      documentName,
      coverageNotes: policy.coverageDetails,
      explanation,
    };
  }

  /**
   * Deterministic Maintenance Evaluation
   */
  static evaluateMaintenance(
    userId: string,
    issue: HouseholdIssue,
    linkedAsset?: HomeAsset
  ): IssueMaintenanceIntelligence {
    const store = getOrCreateUserStore(userId);
    if (!linkedAsset) {
      return {};
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const tasks = Array.from(store.maintenances.values()).filter((m) => m.assetId === linkedAsset.id);

    const completed = tasks
      .filter((m) => m.isCompleted)
      .sort((a, b) => new Date(b.completedDate || b.updatedAt || 0).getTime() - new Date(a.completedDate || a.updatedAt || 0).getTime())
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        title: m.title,
        completedDate: m.completedDate || m.updatedAt?.slice(0, 10),
        serviceProvider: m.serviceProvider,
      }));

    const upcoming = tasks
      .filter((m) => !m.isCompleted && m.dueDate && m.dueDate >= todayIso)
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
        priority: m.priority,
      }));

    const overdue = tasks
      .filter((m) => !m.isCompleted && m.dueDate && m.dueDate < todayIso)
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
      .map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
      }));

    let preventiveOpportunity: string | undefined;
    if (overdue.length > 0) {
      preventiveOpportunity = `This asset has ${overdue.length} overdue preventive maintenance task(s) (e.g. "${overdue[0].title}"). Resolving overdue service may prevent repeat failures.`;
    } else if (completed.length > 0) {
      const last = completed[0];
      preventiveOpportunity = `Last recorded maintenance was "${last.title}" on ${last.completedDate || 'recent date'}. Compare current symptoms against prior service notes.`;
    } else {
      preventiveOpportunity = 'No routine preventive maintenance is currently scheduled for this asset. Consider adding regular service intervals once repaired.';
    }

    return {
      recentMaintenance: completed.length > 0 ? completed : undefined,
      upcomingMaintenance: upcoming.length > 0 ? upcoming : undefined,
      overdueMaintenance: overdue.length > 0 ? overdue : undefined,
      preventiveOpportunity,
      associatedMaintenanceId: issue.maintenanceId,
    };
  }

  /**
   * Deterministic Related & Duplicate Issue Detection
   * Never merges or mutates records automatically.
   */
  static detectRelatedIssues(
    userId: string,
    issue: HouseholdIssue,
    linkedAsset?: HomeAsset
  ): PossibleRelatedIssue[] {
    const store = getOrCreateUserStore(userId);
    const allIssues = Array.from(store.issues.values()).filter((i) => i.id !== issue.id);

    const related: PossibleRelatedIssue[] = [];
    const issueText = `${issue.title} ${issue.description || ''} ${issue.category || ''}`.toLowerCase();

    for (const other of allIssues) {
      const isExplicitlyLinked = Boolean(issue.relatedIssueIds?.includes(other.id));
      const otherText = `${other.title} ${other.description || ''} ${other.category || ''}`.toLowerCase();
      let matchType: PossibleRelatedIssue['relationType'] | null = null;
      let matchReason = '';
      let score = 0;

      // 1. Same Asset
      if (issue.assetId && other.assetId && issue.assetId === other.assetId) {
        score += 50;
        if (other.status === 'resolved' || other.status === 'closed' || other.status === 'verified') {
          matchType = 'repeat_failure';
          matchReason = `Same asset (${linkedAsset?.name || 'Asset'}) had a previously resolved issue: "${other.title}".`;
          score += 30;
        } else {
          matchType = 'same_asset';
          matchReason = `Concurrent open issue on the same asset (${linkedAsset?.name || 'Asset'}).`;
          score += 20;
        }
      }

      // 2. Symptom keyword matching
      for (const [symptomCategory, words] of Object.entries(SYMPTOM_KEYWORDS)) {
        const thisHas = words.some((w) => issueText.includes(w));
        const otherHas = words.some((w) => otherText.includes(w));
        if (thisHas && otherHas) {
          score += 25;
          if (!matchType) {
            matchType = 'symptom_match';
            matchReason = `Similar ${symptomCategory} symptom detected in both issues.`;
          } else {
            matchReason += ` Shares ${symptomCategory} symptoms.`;
          }
          break;
        }
      }

      // 3. Same Room
      if (!matchType && issue.roomId && other.roomId && issue.roomId === other.roomId) {
        matchType = 'same_room';
        matchReason = 'Reported in the same room.';
        score += 20;
      }

      // 4. Same Category
      if (!matchType && issue.category && other.category && issue.category === other.category && issue.category !== 'general') {
        matchType = 'same_category';
        matchReason = `Both issues fall under the ${issue.category} category.`;
        score += 15;
      }

      if (isExplicitlyLinked) {
        score = Math.max(score, 90);
        if (!matchType) {
          matchType = 'same_asset';
          matchReason = 'User confirmed linked issue.';
        }
      }

      if (score >= 20 || isExplicitlyLinked) {
        const otherAsset = other.assetId ? store.assets.get(other.assetId) : undefined;
        related.push({
          id: other.id,
          title: other.title,
          reportedAt: other.reportedAt || other.createdAt,
          status: other.status,
          severity: other.severity,
          assetName: otherAsset?.name,
          assetId: other.assetId,
          roomId: other.roomId,
          relationType: matchType || 'symptom_match',
          relationReason: matchReason || 'Potentially related household problem.',
          similarityScore: Math.min(100, score),
          isLinked: isExplicitlyLinked,
        });
      }
    }

    // Sort by linked first, then similarity score descending
    return related
      .sort((a, b) => {
        if (Boolean(a.isLinked) !== Boolean(b.isLinked)) {
          return a.isLinked ? -1 : 1;
        }
        return b.similarityScore - a.similarityScore;
      })
      .slice(0, 5);
  }

  /**
   * Deterministic Recurrence Failure Intelligence
   */
  static evaluateRecurrence(
    userId: string,
    issue: HouseholdIssue,
    linkedAsset?: HomeAsset
  ): RecurringFailureSignal {
    const store = getOrCreateUserStore(userId);
    if (!issue.assetId) {
      return {
        isRecurring: false,
        repeatedIssueCount: 1,
        recurrenceWindowMonths: 12,
        summary: 'No asset linked. Recurrence tracking requires a registered household appliance or system.',
        insufficientData: true,
      };
    }

    const assetIssues = Array.from(store.issues.values()).filter((i) => i.assetId === issue.assetId);

    if (assetIssues.length <= 1) {
      return {
        isRecurring: false,
        repeatedIssueCount: 1,
        recurrenceWindowMonths: 12,
        firstReportedDate: issue.reportedAt?.slice(0, 10),
        lastReportedDate: issue.reportedAt?.slice(0, 10),
        summary: 'Insufficient historical records to determine recurrence pattern (first recorded issue on this asset).',
        insufficientData: true,
      };
    }

    // Sort chronologically
    const sorted = [...assetIssues].sort(
      (a, b) => new Date(a.reportedAt || a.createdAt || 0).getTime() - new Date(b.reportedAt || b.createdAt || 0).getTime()
    );

    const firstDate = sorted[0].reportedAt?.slice(0, 10) || sorted[0].createdAt?.slice(0, 10);
    const lastDate = sorted[sorted.length - 1].reportedAt?.slice(0, 10) || sorted[sorted.length - 1].createdAt?.slice(0, 10);

    const firstTime = new Date(firstDate || '').getTime();
    const lastTime = new Date(lastDate || '').getTime();
    const windowMonths = Math.max(1, Math.round((lastTime - firstTime) / (1000 * 60 * 60 * 24 * 30.4)));

    const previousResolutions = assetIssues
      .filter((i) => i.status === 'resolved' || i.status === 'verified' || i.status === 'closed')
      .map((i) => ({
        issueId: i.id,
        date: i.resolvedAt?.slice(0, 10) || i.updatedAt?.slice(0, 10) || '',
        resolution: i.resolution,
        cost: i.actualCost,
      }));

    const assetName = linkedAsset?.name || 'Asset';
    const summary = `${assetName} has had ${assetIssues.length} recorded issues over the past ${windowMonths} month(s).`;

    return {
      isRecurring: assetIssues.length >= 2,
      repeatedIssueCount: assetIssues.length,
      recurrenceWindowMonths: windowMonths,
      firstReportedDate: firstDate,
      lastReportedDate: lastDate,
      summary,
      previousResolutions: previousResolutions.length > 0 ? previousResolutions : undefined,
      insufficientData: false,
    };
  }

  /**
   * Generates prioritized, safe Recommended Next Steps
   */
  static generateRecommendedNextSteps(
    issue: HouseholdIssue,
    safety: ReturnType<typeof evaluateIssueSafety>,
    warranty: IssueWarrantyIntelligence,
    maintenance: IssueMaintenanceIntelligence,
    recurrence: RecurringFailureSignal
  ): RecommendedNextStep[] {
    const steps: RecommendedNextStep[] = [];
    let order = 1;

    // 1. Safety Escalation (Strictly Safe Advice)
    if (safety.isSafetyRisk) {
      steps.push({
        id: 'step_safety_escalation',
        order: order++,
        title: `Safety Action: ${safety.hazardType || 'Hazard'} Precautions`,
        actionType: 'safety',
        priority: 'urgent',
        guidance:
          safety.hazardType === 'Gas Leak'
            ? 'Immediately evacuate the property. Do NOT operate switches or appliances. Call your gas provider or emergency services immediately.'
            : safety.hazardType === 'Fire / Smoke Hazard'
            ? 'Cut circuit power if safely accessible. Evacuate and call emergency services if smoke persists.'
            : safety.hazardType === 'Electrical Hazard'
            ? 'Isolate power at the main breaker. Do not touch damp surfaces or frayed wires. Call a licensed electrician.'
            : safety.hazardType === 'Major Water Inundation / Pipe Burst'
            ? 'Shut off the main household water valve immediately to stop water flow and limit structural damage.'
            : 'Observe manufacturer safety warnings. Do not perform high-risk disassembly without certified qualifications.',
        actionableTab: 'maintenance',
      });
    }

    // 2. Warranty Review
    if (warranty.status === 'covered' || warranty.status === 'possibly_covered') {
      steps.push({
        id: 'step_warranty_claim',
        order: order++,
        title: 'Review Warranty Coverage Before Booking Paid Repair',
        actionType: 'warranty',
        priority: 'high',
        guidance: `Asset has active protection with ${warranty.provider || 'Provider'}. Contact the warranty provider or review policy documentation to file a claim and avoid unnecessary out-of-pocket costs.`,
        actionableTab: 'maintenance',
      });
    }

    // 3. Maintenance Linkage
    if (maintenance.overdueMaintenance && maintenance.overdueMaintenance.length > 0) {
      steps.push({
        id: 'step_maintenance_schedule',
        order: order++,
        title: `Address Overdue Maintenance (${maintenance.overdueMaintenance[0].title})`,
        actionType: 'maintenance',
        priority: 'high',
        guidance: 'Resolving overdue maintenance tasks on this appliance may directly address root causes or prevent recurring failures.',
        actionableTab: 'maintenance',
      });
    }

    // 4. Recurrence Root-Cause Investigation
    if (recurrence.isRecurring && recurrence.repeatedIssueCount >= 3) {
      steps.push({
        id: 'step_root_cause',
        order: order++,
        title: 'Request Diagnostic Root-Cause Assessment',
        actionType: 'general',
        priority: 'medium',
        guidance: `This asset has failed ${recurrence.repeatedIssueCount} times. Request technician investigate the root cause rather than replacing transient wear-and-tear parts.`,
        actionableTab: 'maintenance',
      });
    }

    // 5. Service Appointment / Provider Contact
    if (issue.status === 'reported' || issue.status === 'triaged') {
      steps.push({
        id: 'step_schedule_service',
        order: order++,
        title: issue.serviceProvider ? `Contact ${issue.serviceProvider}` : 'Schedule Service Technician',
        actionType: 'provider',
        priority: issue.severity === 'critical' || issue.severity === 'high' ? 'high' : 'medium',
        guidance: issue.serviceProviderContact
          ? `Reach out to ${issue.serviceProvider} at ${issue.serviceProviderContact} to book a diagnostic inspection.`
          : 'Schedule a certified service professional to inspect the equipment and provide an itemized repair quote.',
        actionableTab: 'maintenance',
      });
    }

    // 6. Documentation Collection
    steps.push({
      id: 'step_collect_docs',
      order: order++,
      title: 'Collect Repair Documentation & Receipts',
      actionType: 'document',
      priority: 'low',
      guidance: 'Save technician invoices, part serial numbers, and diagnostic reports to the Documents Vault to preserve appliance resale and warranty history.',
      actionableTab: 'documents',
    });

    // 7. Post-repair Verification
    if (issue.status === 'resolved') {
      steps.push({
        id: 'step_verify_resolution',
        order: order++,
        title: 'Perform Operational Verification Test',
        actionType: 'verification',
        priority: 'medium',
        guidance: 'Run the appliance through a complete operating cycle under observation to ensure no recurring symptoms, leaks, or thermal anomalies before closing.',
        actionableTab: 'maintenance',
      });
    }

    return steps;
  }

  /**
   * Assembles the Resolution Checklist
   */
  static buildResolutionChecklist(issue: HouseholdIssue): ResolutionChecklistItem[] {
    const existingMap = new Map<string, ResolutionChecklistItem>();
    for (const item of issue.resolutionChecklist || []) {
      existingMap.set(item.id, item);
    }

    const todayIso = new Date().toISOString();

    return DEFAULT_CHECKLIST_ITEMS.map((item) => {
      const existing = existingMap.get(item.id);

      // Deterministically derive auto-completion if not explicitly set
      let completed = Boolean(existing?.completed);
      let completedAt = existing?.completedAt;

      if (!completed) {
        if (item.id === 'diagnosis_recorded' && (Boolean(issue.description) || Boolean(issue.notes))) {
          completed = true;
          completedAt = issue.createdAt;
        } else if (item.id === 'warranty_checked' && Boolean(issue.warrantyId)) {
          completed = true;
          completedAt = issue.updatedAt;
        } else if (item.id === 'service_scheduled' && (Boolean(issue.scheduledDate) || issue.status === 'scheduled' || issue.status === 'in_progress')) {
          completed = true;
          completedAt = issue.scheduledDate || issue.updatedAt;
        } else if (item.id === 'repair_completed' && (issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed' || Boolean(issue.resolvedAt))) {
          completed = true;
          completedAt = issue.resolvedAt || issue.updatedAt;
        } else if (item.id === 'cost_recorded' && (typeof issue.actualCost === 'number' || typeof issue.estimatedCost === 'number')) {
          completed = true;
          completedAt = issue.updatedAt;
        } else if (item.id === 'document_attached' && ((issue.attachments?.length || 0) > 0 || (issue.documentIds?.length || 0) > 0)) {
          completed = true;
          completedAt = issue.updatedAt;
        } else if (item.id === 'resolution_notes_recorded' && (Boolean(issue.resolution) || Boolean(issue.rootCause))) {
          completed = true;
          completedAt = issue.resolvedAt || issue.updatedAt;
        } else if (item.id === 'user_verified' && (issue.status === 'verified' || Boolean(issue.verifiedAt))) {
          completed = true;
          completedAt = issue.verifiedAt || issue.updatedAt;
        }
      }

      return {
        id: item.id,
        label: item.label,
        completed,
        completedAt: completed ? completedAt || todayIso : undefined,
        autoDerived: existing ? existing.autoDerived : true,
      };
    });
  }

  /**
   * Assembles a Structured Resolution Summary
   */
  static buildResolutionSummary(
    issue: HouseholdIssue,
    linkedAsset?: HomeAsset,
    propertyName?: string,
    roomName?: string,
    warranty?: IssueWarrantyIntelligence,
    maintenance?: IssueMaintenanceIntelligence
  ): StructuredResolutionSummary {
    const locParts = [propertyName, roomName, linkedAsset?.name].filter(Boolean);
    const affectedLocation = locParts.length > 0 ? locParts.join(' • ') : 'General Household Area';

    return {
      whatHappened: issue.description || issue.title,
      affectedAssetAndLocation: affectedLocation,
      rootCause: issue.rootCause || undefined,
      actionTaken: issue.resolution || (issue.status === 'resolved' ? 'Repair marked completed by homeowner.' : 'Issue closed.'),
      costSummary:
        typeof issue.actualCost === 'number' || typeof issue.estimatedCost === 'number'
          ? {
              actual: issue.actualCost,
              estimated: issue.estimatedCost,
              currency: 'USD',
            }
          : undefined,
      warrantyInvolvement:
        warranty && warranty.status !== 'no_warranty'
          ? `${warranty.statusLabel} (${warranty.provider || 'Provider'})`
          : 'No warranty applied or claimed for this repair.',
      maintenanceImplications:
        maintenance?.preventiveOpportunity || 'Ensure routine maintenance schedule is adjusted if needed.',
      supportingDocuments: (issue.attachments || []).map((a) => ({ id: a.id, name: a.name })),
      resolutionDate: issue.resolvedAt || issue.updatedAt,
      verificationState: issue.verifiedAt ? `Homeowner verified on ${issue.verifiedAt.slice(0, 10)}` : 'Awaiting homeowner operational verification test',
      recommendedPrevention: linkedAsset
        ? `Perform quarterly inspections on ${linkedAsset.name} and monitor operating logs.`
        : 'Monitor affected area for recurring symptoms.',
    };
  }

  /**
   * Generates a concise "Why It Matters" grounded explanation
   */
  static generateWhyItMatters(
    issue: HouseholdIssue,
    safety: ReturnType<typeof evaluateIssueSafety>,
    warranty: IssueWarrantyIntelligence,
    recurrence: RecurringFailureSignal,
    isOverdue: boolean,
    linkedAsset?: HomeAsset
  ): string {
    const reasons: string[] = [];

    if (safety.isSafetyRisk) {
      reasons.push(`Safety hazard flagged (${safety.hazardType}): immediate attention required to safeguard residents and property.`);
    }

    if (isOverdue) {
      reasons.push('This issue is past its target resolution date.');
    }

    if (recurrence.isRecurring) {
      reasons.push(`Recurring failure pattern detected on ${linkedAsset?.name || 'this appliance'} (${recurrence.repeatedIssueCount} recorded incidents).`);
    }

    if (warranty.status === 'covered' && warranty.daysUntilExpiration !== undefined && warranty.daysUntilExpiration <= 60) {
      reasons.push(`Warranty expires soon (${warranty.daysUntilExpiration} days remaining): file claim promptly.`);
    }

    if (reasons.length === 0) {
      if (linkedAsset) {
        return `Affects ${linkedAsset.name}. Timely resolution preserves equipment longevity and prevents escalating secondary damage.`;
      }
      return 'Timely resolution maintains household operating standard and prevents secondary damage.';
    }

    return reasons.join(' ');
  }

  /**
   * User Confirmation: Explicitly link two related issues
   */
  static async linkRelatedIssues(
    userId: string,
    issueId: string,
    targetIssueId: string
  ): Promise<{ success: boolean; issue: HouseholdIssue }> {
    const store = getOrCreateUserStore(userId);
    const issue = store.issues.get(issueId);
    const target = store.issues.get(targetIssueId);

    if (!issue || issue.userId !== userId || !target || target.userId !== userId) {
      const error: any = new Error('Issue not found or unauthorized.');
      error.statusCode = 404;
      throw error;
    }

    const currentLinks = new Set(issue.relatedIssueIds || []);
    currentLinks.add(targetIssueId);
    issue.relatedIssueIds = Array.from(currentLinks);
    issue.updatedAt = new Date().toISOString();

    const targetLinks = new Set(target.relatedIssueIds || []);
    targetLinks.add(issueId);
    target.relatedIssueIds = Array.from(targetLinks);
    target.updatedAt = issue.updatedAt;

    // Record activity
    issue.activityHistory = [
      ...(issue.activityHistory || []),
      {
        id: `act_${crypto.randomUUID()}`,
        timestamp: issue.updatedAt,
        action: `Linked related issue: "${target.title}"`,
        userId,
      },
    ];

    store.issues.set(issue.id, issue);
    store.issues.set(target.id, target);

    return { success: true, issue };
  }

  /**
   * User Confirmation: Explicitly unlink two related issues
   */
  static async unlinkRelatedIssue(
    userId: string,
    issueId: string,
    targetIssueId: string
  ): Promise<{ success: boolean; issue: HouseholdIssue }> {
    const store = getOrCreateUserStore(userId);
    const issue = store.issues.get(issueId);
    const target = store.issues.get(targetIssueId);

    if (!issue || issue.userId !== userId) {
      const error: any = new Error('Issue not found or unauthorized.');
      error.statusCode = 404;
      throw error;
    }

    issue.relatedIssueIds = (issue.relatedIssueIds || []).filter((id) => id !== targetIssueId);
    issue.updatedAt = new Date().toISOString();

    if (target && target.userId === userId) {
      target.relatedIssueIds = (target.relatedIssueIds || []).filter((id) => id !== issueId);
      target.updatedAt = issue.updatedAt;
      store.issues.set(target.id, target);
    }

    store.issues.set(issue.id, issue);
    return { success: true, issue };
  }

  /**
   * Save user toggles on the resolution checklist
   */
  static async updateResolutionChecklist(
    userId: string,
    issueId: string,
    checklist: ResolutionChecklistItem[]
  ): Promise<{ success: boolean; checklist: ResolutionChecklistItem[] }> {
    const store = getOrCreateUserStore(userId);
    const issue = store.issues.get(issueId);

    if (!issue || issue.userId !== userId) {
      const error: any = new Error('Issue not found or unauthorized.');
      error.statusCode = 404;
      throw error;
    }

    issue.resolutionChecklist = checklist.map((item) => ({
      ...item,
      autoDerived: false,
    }));
    issue.updatedAt = new Date().toISOString();

    store.issues.set(issue.id, issue);
    return { success: true, checklist: issue.resolutionChecklist };
  }

  /**
   * Analyzes all recurring issues across the entire household
   */
  static async getHouseholdRecurringPatterns(userId: string): Promise<Array<{
    assetId: string;
    assetName: string;
    issueCount: number;
    windowMonths: number;
    symptoms: string[];
    isUnderWarranty: boolean;
    recommendation: string;
  }>> {
    const store = getOrCreateUserStore(userId);
    const issues = Array.from(store.issues.values());
    const byAsset = new Map<string, HouseholdIssue[]>();

    for (const issue of issues) {
      if (!issue.assetId) continue;
      const list = byAsset.get(issue.assetId) || [];
      list.push(issue);
      byAsset.set(issue.assetId, list);
    }

    const results: Array<{
      assetId: string;
      assetName: string;
      issueCount: number;
      windowMonths: number;
      symptoms: string[];
      isUnderWarranty: boolean;
      recommendation: string;
    }> = [];

    const todayIso = new Date().toISOString().slice(0, 10);

    for (const [assetId, list] of byAsset.entries()) {
      if (list.length < 2) continue;

      const asset = store.assets.get(assetId);
      const assetName = asset?.name || 'Asset';

      const sorted = [...list].sort(
        (a, b) => new Date(a.reportedAt || a.createdAt || 0).getTime() - new Date(b.reportedAt || b.createdAt || 0).getTime()
      );

      const firstDate = sorted[0].reportedAt?.slice(0, 10) || sorted[0].createdAt?.slice(0, 10) || todayIso;
      const lastDate = sorted[sorted.length - 1].reportedAt?.slice(0, 10) || sorted[sorted.length - 1].createdAt?.slice(0, 10) || todayIso;
      const windowMonths = Math.max(1, Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4)));

      // Collect symptoms
      const symptoms = Array.from(
        new Set(list.map((i) => i.subcategory || i.category || i.title).filter(Boolean))
      ).slice(0, 4);

      // Check warranty
      const warranty = Array.from(store.warranties.values()).find(
        (w) => w.assetId === assetId && Boolean(w.endDate && w.endDate >= todayIso)
      );

      results.push({
        assetId,
        assetName,
        issueCount: list.length,
        windowMonths,
        symptoms,
        isUnderWarranty: Boolean(warranty),
        recommendation:
          list.length >= 3
            ? `Evaluate replacement cost vs repair frequency. ${assetName} has required ${list.length} repairs.`
            : `Monitor ${assetName} closely following recent repairs.`,
      });
    }

    return results.sort((a, b) => b.issueCount - a.issueCount);
  }
}
