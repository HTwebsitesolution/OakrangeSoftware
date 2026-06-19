import type Database from "@tauri-apps/plugin-sql";

export type CalibrationJob = {
  id: number;
  customer_name: string;
  site_name: string;
  tool_id: string;
  tool_type: string;
  engineer_name: string;
  status: string;
  created_at: string;
  calibration_date?: string | null;
  temperature?: string | null;
  humidity?: string | null;
  reference_instrument?: string | null;
  engineer_notes?: string | null;
  adjustment_made?: string | null;
};

export type CalibrationReading = {
  id: number;
  job_id: number;
  test_point: string;
  actual_reading: string;
  error_value: string;
  result: string;
  created_at: string;
};

export type CalibrationTestPoint = {
  label: string;
  nominalValue: number;
  unit: string;
  tolerance: number;
};

export type CalibrationTemplate = {
  toolType: string;
  unit: string;
  testPoints: CalibrationTestPoint[];
};

export type ReferenceInstrument = {
  id: number;
  name: string;
  certificate_number: string;
  calibration_due_date: string;
  created_at: string;
};

export type DbConnection = Awaited<ReturnType<typeof Database.load>>;
