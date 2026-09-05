import { HouseholdIssueSeverity } from '../../src/types';

export interface SafetyEvaluationResult {
  isSafetyRisk: boolean;
  hazardType?: string;
  suggestedSeverity?: HouseholdIssueSeverity;
  safetyWarning?: string;
}

interface SafetyRule {
  hazardType: string;
  keywords: RegExp;
  suggestedSeverity: HouseholdIssueSeverity;
  warningText: string;
}

const SAFETY_RULES: SafetyRule[] = [
  {
    hazardType: 'Gas Leak',
    keywords: /\b(gas\s*leak|smell\s*gas|gas\s*odor|rotten\s*egg\s*smell|hissing\s*gas|gas\s*pipe\s*leak|carbon\s*monoxide|co\s*alarm|gas\s*fumes)\b/i,
    suggestedSeverity: 'critical',
    warningText:
      'Potential gas leak safety concern detected. Evacuate the area, do not operate light switches or electrical appliances, and contact your local utility provider or emergency services immediately.',
  },
  {
    hazardType: 'Fire / Smoke Hazard',
    keywords: /\b(smoke|smoking|fire|flames|scorched|burning\s*smell|melted\s*plastic|smoldering|sparking|sparks|short\s*circuit|outlet\s*blackened|hot\s*outlet)\b/i,
    suggestedSeverity: 'critical',
    warningText:
      'Potential fire hazard or thermal anomaly detected. Consider cutting power to the affected circuit or appliance and avoiding use until inspected by a professional.',
  },
  {
    hazardType: 'Electrical Hazard',
    keywords: /\b(electric\s*shock|shocks|electrocution|exposed\s*wir(e|ing)|buzzing\s*panel|circuit\s*breaker\s*spark|live\s*wire|frayed\s*cord\s*spark|water\s*in\s*outlet|flooding\s*near\s*panel)\b/i,
    suggestedSeverity: 'critical',
    warningText:
      'Potential electrical hazard detected. Avoid touching affected components or standing in damp areas nearby. Consider avoiding use until inspected by a licensed electrician.',
  },
  {
    hazardType: 'Dangerous Vehicle Condition',
    keywords: /\b(brake\s*failure|brakes\s*not\s*working|steering\s*lock|loss\s*of\s*steering|steering\s*failure|tire\s*blowout|brake\s*fluid\s*leak|engine\s*stalling\s*highway|airbag\s*deployed|fuel\s*leak)\b/i,
    suggestedSeverity: 'critical',
    warningText:
      'Potential vehicle safety hazard detected. Do not operate this vehicle on public roadways until inspected and certified by an authorized mechanic.',
  },
  {
    hazardType: 'Major Water Inundation / Pipe Burst',
    keywords: /\b(burst\s*pipe|flooding|water\s*gushing|major\s*leak|ceiling\s*collapse\s*water|water\s*pouring|sewage\s*backup|blackwater)\b/i,
    suggestedSeverity: 'high',
    warningText:
      'Potential major water damage hazard detected. Shut off the primary water main valve if safe to do so to minimize structural and electrical damage.',
  },
  {
    hazardType: 'Structural Concern',
    keywords: /\b(structural\s*crack|sagging\s*roof|foundation\s*crack|load\s*bearing\s*sag|wall\s*bowing|ceiling\s*sagging|sinkhole)\b/i,
    suggestedSeverity: 'high',
    warningText:
      'Potential structural integrity concern detected. Avoid loading the affected area until evaluated by a licensed structural engineer or building inspector.',
  },
  {
    hazardType: 'Battery Overheating / Thermal Runaway',
    keywords: /\b(battery\s*swollen|swelling\s*battery|bulging\s*battery|battery\s*hissing|battery\s*overheating|battery\s*acid\s*leak)\b/i,
    suggestedSeverity: 'high',
    warningText:
      'Potential battery chemical or thermal hazard detected. Disconnect charger, power down the device, place it on a non-flammable surface, and do not attempt to puncture or compress the battery.',
  },
];

/**
 * Deterministically evaluates text for immediate safety hazards
 */
export function evaluateIssueSafety(
  title: string,
  description?: string,
  notes?: string
): SafetyEvaluationResult {
  const combinedText = `${title || ''} ${description || ''} ${notes || ''}`.trim();

  if (!combinedText) {
    return { isSafetyRisk: false };
  }

  for (const rule of SAFETY_RULES) {
    if (rule.keywords.test(combinedText)) {
      return {
        isSafetyRisk: true,
        hazardType: rule.hazardType,
        suggestedSeverity: rule.suggestedSeverity,
        safetyWarning: rule.warningText,
      };
    }
  }

  return { isSafetyRisk: false };
}

export class IssueSafetyService {
  static detectSafetyHazards(
    title: string,
    description?: string,
    notes?: string
  ): SafetyEvaluationResult & { escalationAdvice?: string } {
    const res = evaluateIssueSafety(title, description, notes);
    return {
      ...res,
      escalationAdvice: res.safetyWarning,
    };
  }
}
