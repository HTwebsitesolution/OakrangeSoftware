import type {
  CalibrationReading,
  CalibrationTemplate,
  CalibrationTestPoint,
} from "./types";

/**
 * Oakrange calibration template register.
 * All tolerance values are prototype/demo until official Oakrange rules are supplied.
 */
export const CALIBRATION_TEMPLATES: CalibrationTemplate[] = [
  {
    id: "torque-wrench",
    toolType: "Torque Wrench",
    unit: "Nm",
    rulesSource: "prototype",
    description: "Torque wrench calibration with three standard test points.",
    testPoints: [
      {
        label: "20 Nm",
        nominalValue: 20,
        unit: "Nm",
        tolerance: 1,
      },
      {
        label: "60 Nm",
        nominalValue: 60,
        unit: "Nm",
        tolerance: 2,
      },
      {
        label: "100 Nm",
        nominalValue: 100,
        unit: "Nm",
        tolerance: 3,
      },
    ],
  },
  {
    id: "pressure-gauge",
    toolType: "Pressure Gauge",
    unit: "bar",
    rulesSource: "prototype",
    description:
      "Pressure gauge calibration — prototype demo points for development only.",
    testPoints: [
      {
        label: "1 bar",
        nominalValue: 1,
        unit: "bar",
        tolerance: 0.05,
      },
      {
        label: "5 bar",
        nominalValue: 5,
        unit: "bar",
        tolerance: 0.25,
      },
      {
        label: "10 bar",
        nominalValue: 10,
        unit: "bar",
        tolerance: 0.5,
      },
    ],
  },
  {
    id: "tyre-inflator",
    toolType: "Tyre Inflator",
    unit: "psi",
    rulesSource: "prototype",
    description:
      "Tyre inflator calibration — prototype demo points for development only.",
    testPoints: [
      {
        label: "30 psi",
        nominalValue: 30,
        unit: "psi",
        tolerance: 1.5,
      },
      {
        label: "35 psi",
        nominalValue: 35,
        unit: "psi",
        tolerance: 1.75,
      },
      {
        label: "40 psi",
        nominalValue: 40,
        unit: "psi",
        tolerance: 2,
      },
    ],
  },
  {
    id: "wheel-balancer",
    toolType: "Wheel Balancer",
    unit: "g",
    rulesSource: "prototype",
    description:
      "Wheel balancer calibration — prototype demo points for development only.",
    testPoints: [
      {
        label: "50 g",
        nominalValue: 50,
        unit: "g",
        tolerance: 2,
      },
      {
        label: "100 g",
        nominalValue: 100,
        unit: "g",
        tolerance: 4,
      },
      {
        label: "150 g",
        nominalValue: 150,
        unit: "g",
        tolerance: 6,
      },
    ],
  },
];

export function getTemplate(toolType: string) {
  return CALIBRATION_TEMPLATES.find(
    (template) => template.toolType === toolType
  );
}

export function getTemplateById(templateId: string) {
  return CALIBRATION_TEMPLATES.find((template) => template.id === templateId);
}

export function normaliseText(value: string) {
  return value.trim().toLowerCase();
}

export function isPointRequired(point: CalibrationTestPoint) {
  return point.required !== false;
}

export function getRequiredTestPoints(template: CalibrationTemplate | undefined) {
  return template?.testPoints.filter(isPointRequired) ?? [];
}

export function hasRequiredTestPoints(template: CalibrationTemplate | undefined) {
  return getRequiredTestPoints(template).length > 0;
}

export function findTestPointForLabel(
  template: CalibrationTemplate | undefined,
  pointLabel: string
) {
  return template?.testPoints.find(
    (point) => normaliseText(point.label) === normaliseText(pointLabel)
  );
}

export function formatNominalDisplay(point: CalibrationTestPoint) {
  return `${point.nominalValue} ${point.unit}`;
}

export function formatToleranceDisplay(point: CalibrationTestPoint) {
  return `±${point.tolerance.toFixed(2)} ${point.unit}`;
}

export function formatTestPointSummary(point: CalibrationTestPoint) {
  return `${point.label} (expected ${formatNominalDisplay(point)}, tolerance ${formatToleranceDisplay(point)})`;
}

export function showsPrototypeRulesNotice(template: CalibrationTemplate) {
  return (
    template.rulesSource === "prototype" && template.toolType !== "Torque Wrench"
  );
}

export function getReadingForPoint(
  readings: CalibrationReading[],
  pointLabel: string
) {
  return readings.find(
    (reading) => normaliseText(reading.test_point) === normaliseText(pointLabel)
  );
}

export type TemplateCompletionState = {
  requiredPoints: CalibrationTestPoint[];
  completedRequiredPoints: CalibrationTestPoint[];
  missingRequiredPoints: CalibrationTestPoint[];
  allRequiredPointsCompleted: boolean;
  canMarkReadyForReview: boolean;
};

export function getTemplateCompletionState(
  template: CalibrationTemplate | undefined,
  readings: CalibrationReading[]
): TemplateCompletionState {
  const requiredPoints = getRequiredTestPoints(template);
  const completedRequiredPoints = requiredPoints.filter((point) =>
    getReadingForPoint(readings, point.label)
  );
  const missingRequiredPoints = requiredPoints.filter(
    (point) => !getReadingForPoint(readings, point.label)
  );

  const hasRequiredPoints = requiredPoints.length > 0;
  const allRequiredPointsCompleted = hasRequiredPoints
    ? completedRequiredPoints.length === requiredPoints.length
    : readings.length > 0;

  const canMarkReadyForReview =
    allRequiredPointsCompleted && readings.length > 0;

  return {
    requiredPoints,
    completedRequiredPoints,
    missingRequiredPoints,
    allRequiredPointsCompleted,
    canMarkReadyForReview,
  };
}

function getNumberFromText(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function formatSignedNumber(value: number) {
  const fixedValue = value.toFixed(2);
  return value > 0 ? `+${fixedValue}` : fixedValue;
}

export function calculateErrorAndResult(
  template: CalibrationTemplate | undefined,
  pointLabel: string,
  actualText: string
) {
  const matchingPoint = findTestPointForLabel(template, pointLabel);
  const actualValue = getNumberFromText(actualText);

  if (!matchingPoint || actualValue === null) {
    return null;
  }

  const calculatedError = actualValue - matchingPoint.nominalValue;
  const roundedError = Number(calculatedError.toFixed(2));
  const calculatedResult =
    Math.abs(roundedError) <= matchingPoint.tolerance ? "Pass" : "Fail";

  return {
    errorText: `${formatSignedNumber(roundedError)} ${matchingPoint.unit}`,
    resultText: calculatedResult,
  };
}
