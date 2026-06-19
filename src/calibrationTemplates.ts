import type {
  CalibrationReading,
  CalibrationTemplate,
} from "./types";

export const CALIBRATION_TEMPLATES: CalibrationTemplate[] = [
  {
    toolType: "Torque Wrench",
    unit: "Nm",
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
    toolType: "Pressure Gauge",
    unit: "bar / psi",
    testPoints: [],
  },
  {
    toolType: "Tyre Inflator",
    unit: "psi / bar",
    testPoints: [],
  },
  {
    toolType: "Wheel Balancer",
    unit: "g",
    testPoints: [],
  },
];

export function getTemplate(toolType: string) {
  return CALIBRATION_TEMPLATES.find(
    (template) => template.toolType === toolType
  );
}

function getNumberFromText(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function formatSignedNumber(value: number) {
  const fixedValue = value.toFixed(2);
  return value > 0 ? `+${fixedValue}` : fixedValue;
}

export function normaliseText(value: string) {
  return value.trim().toLowerCase();
}

export function getReadingForPoint(
  readings: CalibrationReading[],
  pointLabel: string
) {
  return readings.find(
    (reading) => normaliseText(reading.test_point) === normaliseText(pointLabel)
  );
}

export function calculateErrorAndResult(
  template: CalibrationTemplate | undefined,
  pointLabel: string,
  actualText: string
) {
  const matchingPoint = template?.testPoints.find(
    (point) => point.label === pointLabel
  );

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
