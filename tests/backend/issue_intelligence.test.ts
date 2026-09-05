import { apiRequest, TestRunner } from '../test-helper';
import { IssueSafetyService } from '../../server/services/issueSafetyService';
import { IssueIntelligenceService } from '../../server/services/issueIntelligenceService';
import { ToolExecutor } from '../../server/services/agent/toolExecutor';

export async function runIssueIntelligenceTests(runner: TestRunner) {
  runner.setSuite('Phase 24.3: Issue Intelligence & Resolution Intelligence');

  const token1 = 'test-token-issue-intel-user1';
  const token2 = 'test-token-issue-intel-user2';

  let asset1Id = '';
  let warranty1Id = '';
  let issue1Id = '';
  let issue2Id = '';

  // 1. Setup Base Household Asset & Warranty
  await runner.test('Setup: Create asset and active warranty for user 1', async () => {
    const assetRes = await apiRequest('/api/household/assets', {
      method: 'POST',
      token: token1,
      body: {
        name: 'Samsung French Door Refrigerator',
        category: 'appliances',
        brand: 'Samsung',
        modelNumber: 'RF28R7351SR',
        roomLocation: 'Kitchen',
        purchasePrice: 2200,
        purchaseDate: '2025-01-15',
        installDate: '2025-01-20',
        expectedLifespanYears: 10,
        currentStatus: 'operational',
      },
    });

    const assetData = assetRes.body?.data || assetRes.body?.asset;
    if (assetRes.status !== 201 || !assetData?.id) {
      throw new Error(`Failed to create asset: ${JSON.stringify(assetRes.body)}`);
    }
    asset1Id = assetData.id;

    const warRes = await apiRequest('/api/household/warranties', {
      method: 'POST',
      token: token1,
      body: {
        assetId: asset1Id,
        warrantyProvider: 'Samsung Care+ Protection',
        policyNumber: 'SAM-WAR-88291',
        coverageType: 'extended',
        status: 'active',
        startDate: '2025-01-15',
        endDate: '2028-01-15',
        notes: 'Full parts and labor repair coverage for compressor and sealed system',
      },
    });

    const warData = warRes.body?.data || warRes.body?.warranty;
    if (warRes.status !== 201 || !warData?.id) {
      throw new Error(`Failed to create warranty: ${JSON.stringify(warRes.body)}`);
    }
    warranty1Id = warData.id;
  });

  // 2. Safety Detection Service Unit Validation
  await runner.test('Safety Engine: Classifies electrical hazards and provides safe escalation advice', async () => {
    const hazard = IssueSafetyService.detectSafetyHazards(
      'Electric Shock Risk',
      'The breaker tripped and there is exposed live electrical wiring near the kitchen appliance.'
    );

    if (!hazard.isSafetyRisk) {
      throw new Error('Expected safety hazard to be flagged');
    }
    if (!hazard.hazardType?.includes('Electrical')) {
      throw new Error(`Expected Electrical hazardType, got: ${hazard.hazardType}`);
    }
    if (hazard.suggestedSeverity !== 'critical') {
      throw new Error(`Expected critical severity, got: ${hazard.suggestedSeverity}`);
    }
    if (!hazard.escalationAdvice?.includes('electrician') && !hazard.escalationAdvice?.includes('power')) {
      throw new Error(`Escalation advice missing emergency safety directive: ${hazard.escalationAdvice}`);
    }
  });

  await runner.test('Safety Engine: Identifies gas leak risks and structural hazards without false positives on benign issues', async () => {
    const gasRisk = IssueSafetyService.detectSafetyHazards('Smell gas near stove', 'Strong gas leak odor in kitchen');
    if (!gasRisk.isSafetyRisk || !gasRisk.hazardType?.includes('Gas')) {
      throw new Error(`Expected gas leak detection, got: ${JSON.stringify(gasRisk)}`);
    }

    const benignIssue = IssueSafetyService.detectSafetyHazards('Squeaky door hinge', 'Master bedroom door makes noise when opening');
    if (benignIssue.isSafetyRisk) {
      throw new Error('Benign door hinge should NOT be flagged as a safety hazard');
    }
  });

  // 3. Natural Language Issue Extraction Endpoint
  await runner.test('Extraction API: Extracts candidate issue and severity from natural language description', async () => {
    const res = await apiRequest('/api/household/issues/extract', {
      method: 'POST',
      token: token1,
      body: {
        input: 'My Samsung refrigerator is leaking water all over the floor and not cooling properly',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK from extraction, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    const candidateIssues = res.body?.data?.candidateIssues || res.body?.candidateIssues;
    if (!candidateIssues || candidateIssues.length === 0 || !candidateIssues[0].title) {
      throw new Error(`Missing candidateIssues in extraction response: ${JSON.stringify(res.body)}`);
    }
  });

  // 4. Issue Creation with Automatic Safety Tagging
  await runner.test('Issue Creation: Creates critical ticket with automatic safety detection and default checklist', async () => {
    const res = await apiRequest('/api/household/issues', {
      method: 'POST',
      token: token1,
      body: {
        title: 'Refrigerator not cooling and leaking water',
        description: 'Compressor is making a loud buzzing noise, internal temp is 58F, and water pooling underneath.',
        assetId: asset1Id,
        category: 'appliances',
        severity: 'high',
        estimatedCost: 250,
      },
    });

    const issue = res.body?.data || res.body?.issue;
    if (res.status !== 201 || !issue?.id) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    issue1Id = issue.id;
    if (issue.status !== 'reported') {
      throw new Error(`Expected default reported status, got: ${issue.status}`);
    }
  });

  // 5. Create Second Related Issue for Duplicate & Recurrence Testing
  await runner.test('Issue Creation: Creates second issue on same asset to test recurrence and relationship intelligence', async () => {
    const res = await apiRequest('/api/household/issues', {
      method: 'POST',
      token: token1,
      body: {
        title: 'Refrigerator cooling failure recurring',
        description: 'Temperature warning beeping again, ice maker is warm and defrost cycle failing.',
        assetId: asset1Id,
        category: 'appliances',
        severity: 'high',
      },
    });

    const issue = res.body?.data || res.body?.issue;
    if (res.status !== 201 || !issue?.id) {
      throw new Error(`Failed to create second issue: ${JSON.stringify(res.body)}`);
    }
    issue2Id = issue.id;
  });

  // 6. Comprehensive Issue Intelligence Analysis
  await runner.test('Intelligence Engine: Generates grounded multi-pillar intelligence report', async () => {
    const res = await apiRequest(`/api/household/issues/${issue1Id}/intelligence`, {
      method: 'GET',
      token: token1,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK from intelligence, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const report = res.body?.data || res.body?.intelligence || res.body?.report;
    if (!report) {
      throw new Error('Missing intelligence report payload');
    }

    // Why it matters
    if (!report.whyItMatters || typeof report.whyItMatters !== 'string') {
      throw new Error('Missing whyItMatters explanation');
    }

    // Linked Asset
    if (report.linkedAsset?.id !== asset1Id || report.linkedAsset?.name !== 'Samsung French Door Refrigerator') {
      throw new Error(`Linked asset mismatch: ${JSON.stringify(report.linkedAsset)}`);
    }

    // Warranty Intelligence
    if (report.warrantyIntelligence?.status !== 'covered') {
      throw new Error(`Expected warranty status "covered", got: ${report.warrantyIntelligence?.status}`);
    }
    if (report.warrantyIntelligence?.provider !== 'Samsung Care+ Protection') {
      throw new Error(`Expected Samsung Care+ Protection provider, got: ${report.warrantyIntelligence?.provider}`);
    }

    // Related Issues Detection
    if (!Array.isArray(report.relatedIssues) || report.relatedIssues.length === 0) {
      throw new Error('Expected related issues to be detected for same asset');
    }
    const matchingIssue2 = report.relatedIssues.find((r: any) => r.id === issue2Id);
    if (!matchingIssue2) {
      throw new Error('Expected issue2 to be surfaced as a related issue');
    }

    // Recurrence Signal
    if (!report.recurringSignal?.isRecurring || report.recurringSignal?.repeatedIssueCount < 2) {
      throw new Error(`Expected recurring signal with count >= 2, got: ${JSON.stringify(report.recurringSignal)}`);
    }

    // Recommended Next Steps
    if (!Array.isArray(report.recommendedNextSteps) || report.recommendedNextSteps.length === 0) {
      throw new Error('Expected structured recommended next steps');
    }

    // Resolution Checklist
    if (!Array.isArray(report.checklist) || report.checklist.length === 0) {
      throw new Error('Expected resolution checklist in intelligence report');
    }
  });

  // 7. Explicit User Linking of Related Issues
  await runner.test('Related Issues: Explicitly links two related tickets with user confirmation', async () => {
    const res = await apiRequest(`/api/household/issues/${issue1Id}/link-related`, {
      method: 'POST',
      token: token1,
      body: {
        targetIssueId: issue2Id,
        reason: 'Both tickets represent compressor and cooling sensor degradation on the same appliance.',
      },
    });

    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Failed to link issues: ${JSON.stringify(res.body)}`);
    }

    const updatedIssue1 = res.body.data?.issue || res.body.issue;
    if (!updatedIssue1?.relatedIssueIds?.includes(issue2Id)) {
      throw new Error('issue1 relatedIssueIds does not contain issue2Id');
    }
  });

  // 8. Resolution Checklist Toggle & Persistence
  await runner.test('Checklist: Updates and persists interactive checklist completion state', async () => {
    const res = await apiRequest(`/api/household/issues/${issue1Id}/checklist`, {
      method: 'PUT',
      token: token1,
      body: {
        checklist: [
          { id: 'diag_recorded', label: 'Diagnosis & symptoms recorded', completed: true, completedAt: new Date().toISOString() },
          { id: 'warranty_checked', label: 'Warranty coverage checked', completed: true, completedAt: new Date().toISOString() },
          { id: 'service_scheduled', label: 'Service technician scheduled', completed: false },
          { id: 'repair_completed', label: 'Repair executed and tested', completed: false },
          { id: 'cost_recorded', label: 'Final cost & invoice recorded', completed: false },
          { id: 'user_verified', label: 'Homeowner verified repair', completed: false },
        ],
      },
    });

    const checklist = res.body?.data || res.body?.checklist;
    if (res.status !== 200 || !Array.isArray(checklist)) {
      throw new Error(`Failed to update checklist: ${JSON.stringify(res.body)}`);
    }

    const completedItems = checklist.filter((c: any) => c.completed);
    if (completedItems.length !== 2) {
      throw new Error(`Expected 2 completed checklist items, got ${completedItems.length}`);
    }
  });

  // 9. Root Cause Diagnostic Update
  await runner.test('Root Cause: Saves technician root cause diagnostic', async () => {
    const res = await apiRequest(`/api/household/issues/${issue1Id}/root-cause`, {
      method: 'PUT',
      token: token1,
      body: {
        rootCause: 'Defective evaporator fan motor and iced-up defrost drain trough.',
      },
    });

    const issue = res.body?.data || res.body?.issue;
    if (res.status !== 200 || !issue) {
      throw new Error(`Failed to update root cause: ${JSON.stringify(res.body)}`);
    }
    if (issue.rootCause !== 'Defective evaporator fan motor and iced-up defrost drain trough.') {
      throw new Error(`Unexpected rootCause: ${issue.rootCause}`);
    }
  });

  // 10. Lifecycle Status Transitions: Reported -> Triaged -> In Progress -> Resolved
  await runner.test('Lifecycle: Transitions ticket through triage, work in progress, and resolution', async () => {
    // Step 1: Triage
    const triageRes = await apiRequest(`/api/household/issues/${issue1Id}/transition`, {
      method: 'POST',
      token: token1,
      body: {
        newStatus: 'triaged',
        note: 'Assigned to appliance warranty specialist.',
      },
    });
    if (triageRes.status !== 200) {
      throw new Error(`Failed to triage: ${JSON.stringify(triageRes.body)}`);
    }

    // Step 2: In Progress
    const inProgRes = await apiRequest(`/api/household/issues/${issue1Id}/transition`, {
      method: 'POST',
      token: token1,
      body: {
        newStatus: 'in_progress',
        note: 'Technician on site inspecting refrigerator.',
      },
    });
    if (inProgRes.status !== 200) {
      throw new Error(`Failed to start work: ${JSON.stringify(inProgRes.body)}`);
    }

    // Step 3: Resolved
    const res = await apiRequest(`/api/household/issues/${issue1Id}/transition`, {
      method: 'POST',
      token: token1,
      body: {
        newStatus: 'resolved',
        note: 'Technician replaced evaporator fan and cleaned drain line under warranty.',
        resolution: 'Replaced OEM evaporator fan motor (Part #DA31-00146E) and thawed defrost trough. Unit cooling at 37F.',
        actualCost: 65,
      },
    });

    const resolvedIssue = res.body?.data || res.body?.issue;
    if (res.status !== 200 || !resolvedIssue) {
      throw new Error(`Failed to transition status: ${JSON.stringify(res.body)}`);
    }

    if (resolvedIssue.status !== 'resolved') {
      throw new Error(`Expected resolved status, got: ${resolvedIssue.status}`);
    }
    if (resolvedIssue.actualCost !== 65) {
      throw new Error(`Expected actualCost 65, got: ${resolvedIssue.actualCost}`);
    }

    // Check intelligence report for StructuredResolutionSummary
    const intelRes = await apiRequest(`/api/household/issues/${issue1Id}/intelligence`, {
      method: 'GET',
      token: token1,
    });

    const report = intelRes.body?.data || intelRes.body?.intelligence || intelRes.body?.report;
    const summary = report?.resolutionSummary;
    if (!summary) {
      throw new Error(`Expected structured resolution summary for resolved ticket: ${JSON.stringify(report)}`);
    }
    if (!summary.actionTaken?.includes('Replaced OEM evaporator fan')) {
      throw new Error(`Unexpected actionTaken in summary: ${summary.actionTaken}`);
    }
  });

  // 11. Unlink Related Issue
  await runner.test('Related Issues: Explicitly unlinks previously connected tickets', async () => {
    const res = await apiRequest(`/api/household/issues/${issue1Id}/unlink-related`, {
      method: 'POST',
      token: token1,
      body: {
        targetIssueId: issue2Id,
      },
    });

    const updated = res.body?.data?.issue || res.body?.issue;
    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Failed to unlink issues: ${JSON.stringify(res.body)}`);
    }
    if (updated?.relatedIssueIds?.includes(issue2Id)) {
      throw new Error('issue1 still contains issue2Id in relatedIssueIds after unlink');
    }
  });

  // 12. Household-wide Recurring Failure Insights
  await runner.test('Recurring Insights: Surfaces household-wide repeat failure assets and counts', async () => {
    const res = await apiRequest('/api/household/issues/recurring-insights', {
      method: 'GET',
      token: token1,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK from recurring-insights, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const insights = res.body?.data || res.body?.insights;
    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error(`Expected at least one recurring asset insight, got: ${JSON.stringify(res.body)}`);
    }

    const fridgeInsight = insights.find((i: any) => i.assetId === asset1Id);
    if (!fridgeInsight) {
      throw new Error('Expected recurring insight for Samsung Refrigerator');
    }
    if (fridgeInsight.issueCount < 2) {
      throw new Error(`Expected issueCount >= 2, got: ${fridgeInsight.issueCount}`);
    }
  });

  // 13. Controlled Copilot Agent Tool Integration
  await runner.test('Agent Tools: getHouseholdIssues allowlisted tool executes safely with strict tenant isolation', async () => {
    const execRes = await ToolExecutor.executeTool(
      'test-user-issue-intel-1',
      'getHouseholdIssues',
      { status: 'all' }
    );

    if (execRes.status !== 'success') {
      throw new Error(`Tool execution failed: ${execRes.error}`);
    }
    if (execRes.auditRecord.category !== 'READ') {
      throw new Error(`Expected READ category, got: ${execRes.auditRecord.category}`);
    }
  });

  // 14. Multi-Tenant Isolation Negative Security Tests
  await runner.test('Security: User 2 cannot access, transition, or link User 1 household tickets', async () => {
    // Attempt GET User 1 issue from User 2
    const getRes = await apiRequest(`/api/household/issues/${issue1Id}`, {
      method: 'GET',
      token: token2,
    });
    if (getRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant issue fetch, got: ${getRes.status}`);
    }

    // Attempt intelligence access across tenants
    const intelRes = await apiRequest(`/api/household/issues/${issue1Id}/intelligence`, {
      method: 'GET',
      token: token2,
    });
    if (intelRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant intelligence fetch, got: ${intelRes.status}`);
    }

    // Attempt status transition across tenants
    const transRes = await apiRequest(`/api/household/issues/${issue1Id}/transition`, {
      method: 'POST',
      token: token2,
      body: { newStatus: 'closed' },
    });
    if (transRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant transition, got: ${transRes.status}`);
    }

    // Attempt delete across tenants
    const delRes = await apiRequest(`/api/household/issues/${issue1Id}`, {
      method: 'DELETE',
      token: token2,
    });
    if (delRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant delete, got: ${delRes.status}`);
    }
  });
}
