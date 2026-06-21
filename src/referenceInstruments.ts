import type { ReferenceInstrument } from "./types";

export function formatInstrumentLabel(instrument: ReferenceInstrument) {
  return `${instrument.name} - ${instrument.certificate_number}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function isInstrumentExpired(dueDate: string) {
  const due = parseDateOnly(dueDate);

  if (!due) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
}

export function getInstrumentValidity(dueDate: string) {
  return isInstrumentExpired(dueDate) ? "Expired" : "Valid";
}

export function formatDisplayDate(value: string) {
  const parsed = parseDateOnly(value);

  if (!parsed) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getExpiredInstrumentSaveWarning() {
  return (
    "IMPORTANT: The selected reference instrument has an EXPIRED calibration due date.\n\n" +
    "This instrument should be replaced or re-calibrated before use. " +
    "Saving this job with an expired reference instrument may affect calibration traceability.\n\n" +
    "Do you want to save anyway?"
  );
}
