import { TestRunner } from '../test-helper';
import { HOUSEMIND_TOURS } from '../../src/components/tours/tourDefinitions';

export async function runTourValidatorUnitTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Unit: Guided Tour Definitions & Structural Step Validation');

  const tourList = Object.values(HOUSEMIND_TOURS);

  await runner.test('defines_all_11_required_guided_tours_with_unique_ids', () => {
    const requiredTours = [
      'overview',
      'command_center',
      'health',
      'upload_scan',
      'assets_issues',
      'finance',
      'calendar_notifications',
      'unified_actions',
      'cross_domain',
      'morning_brief',
      'copilot',
    ];

    const definedIds = Object.keys(HOUSEMIND_TOURS);
    for (const reqId of requiredTours) {
      if (!definedIds.includes(reqId)) {
        throw new Error(`Required tour '${reqId}' missing from HOUSEMIND_TOURS definition`);
      }
    }

    const uniqueSet = new Set(definedIds);
    if (uniqueSet.size !== definedIds.length) {
      throw new Error('Duplicate tour ID found in HOUSEMIND_TOURS');
    }
  });

  await runner.test('validates_every_tour_has_non_empty_steps_with_valid_titles_and_descriptions', () => {
    for (const tour of tourList) {
      if (!tour.title || tour.title.trim().length === 0) {
        throw new Error(`Tour ${tour.id} has empty title`);
      }
      if (!Array.isArray(tour.steps) || tour.steps.length === 0) {
        throw new Error(`Tour ${tour.id} has 0 steps`);
      }

      for (let i = 0; i < tour.steps.length; i++) {
        const step = tour.steps[i];
        if (!step.title || step.title.trim().length === 0) {
          throw new Error(`Tour ${tour.id} step ${i + 1} has empty title`);
        }
        if (!step.description || step.description.trim().length === 0) {
          throw new Error(`Tour ${tour.id} step ${i + 1} has empty description`);
        }
      }
    }
  });

  await runner.test('validates_tour_navigation_target_tabs_match_known_application_tabs', () => {
    const validTabs = [
      'dashboard',
      'properties',
      'assets',
      'finances',
      'expenses',
      'documents',
      'calendar',
      'notifications',
      'copilot',
      'health',
      'profile',
      'upload',
      'simulator',
      'maintenance',
      'utilities',
      'help',
    ];

    for (const tour of tourList) {
      for (const step of tour.steps) {
        if (step.tab && !validTabs.includes(step.tab)) {
          throw new Error(`Tour ${tour.id} step specifies unknown tab: ${step.tab}`);
        }
      }
    }
  });
}
