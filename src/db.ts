import Database from "@tauri-apps/plugin-sql";
import type {
  CalibrationJob,
  CalibrationReading,
  DbConnection,
  ReferenceInstrument,
} from "./types";

export const DB_PATH = "sqlite:oakrange_calibration.db";

async function addMissingColumn(
  database: DbConnection,
  columnName: string,
  columnDefinition: string
) {
  const columns = await database.select<Array<{ name: string }>>(
    "PRAGMA table_info(calibration_jobs)"
  );

  const columnExists = columns.some((column) => column.name === columnName);

  if (!columnExists) {
    await database.execute(
      `ALTER TABLE calibration_jobs ADD COLUMN ${columnDefinition}`
    );
  }
}

export async function setupDatabase(): Promise<DbConnection> {
  const database = await Database.load(DB_PATH);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS calibration_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      site_name TEXT NOT NULL,
      tool_id TEXT NOT NULL,
      tool_type TEXT NOT NULL,
      engineer_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await addMissingColumn(database, "calibration_date", "calibration_date TEXT");
  await addMissingColumn(database, "temperature", "temperature TEXT");
  await addMissingColumn(database, "humidity", "humidity TEXT");
  await addMissingColumn(
    database,
    "reference_instrument",
    "reference_instrument TEXT"
  );
  await addMissingColumn(database, "engineer_notes", "engineer_notes TEXT");
  await addMissingColumn(database, "adjustment_made", "adjustment_made TEXT");

  await database.execute(`
    CREATE TABLE IF NOT EXISTS calibration_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      test_point TEXT NOT NULL,
      actual_reading TEXT NOT NULL,
      error_value TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES calibration_jobs(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS reference_instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      certificate_number TEXT NOT NULL,
      calibration_due_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await database.execute(`
    UPDATE calibration_jobs
    SET status = 'Draft'
    WHERE status = 'Saved Offline'
  `);

  return database;
}

export async function fetchJobs(database: DbConnection) {
  return database.select<CalibrationJob[]>(
    "SELECT * FROM calibration_jobs ORDER BY id DESC"
  );
}

export async function fetchReadings(database: DbConnection, jobId: number) {
  return database.select<CalibrationReading[]>(
    "SELECT * FROM calibration_readings WHERE job_id = $1 ORDER BY id DESC",
    [jobId]
  );
}

export async function fetchReferenceInstruments(database: DbConnection) {
  return database.select<ReferenceInstrument[]>(
    "SELECT * FROM reference_instruments ORDER BY name ASC, id ASC"
  );
}

export type JobMetadataUpdate = {
  customer_name: string;
  site_name: string;
  tool_id: string;
  tool_type: string;
  engineer_name: string;
  calibration_date: string;
  temperature: string;
  humidity: string;
  reference_instrument: string;
  adjustment_made: string;
  engineer_notes: string;
};

export async function updateJobMetadata(
  database: DbConnection,
  jobId: number,
  metadata: JobMetadataUpdate
) {
  await database.execute(
    `
    UPDATE calibration_jobs
    SET customer_name = $1,
        site_name = $2,
        tool_id = $3,
        tool_type = $4,
        engineer_name = $5,
        calibration_date = $6,
        temperature = $7,
        humidity = $8,
        reference_instrument = $9,
        adjustment_made = $10,
        engineer_notes = $11
    WHERE id = $12
    `,
    [
      metadata.customer_name,
      metadata.site_name,
      metadata.tool_id,
      metadata.tool_type,
      metadata.engineer_name,
      metadata.calibration_date,
      metadata.temperature,
      metadata.humidity,
      metadata.reference_instrument,
      metadata.adjustment_made,
      metadata.engineer_notes,
      jobId,
    ]
  );
}

export async function updateReferenceInstrument(
  database: DbConnection,
  instrumentId: number,
  name: string,
  certificateNumber: string,
  calibrationDueDate: string
) {
  await database.execute(
    `
    UPDATE reference_instruments
    SET name = $1,
        certificate_number = $2,
        calibration_due_date = $3
    WHERE id = $4
    `,
    [name, certificateNumber, calibrationDueDate, instrumentId]
  );
}

export async function deleteReferenceInstrument(
  database: DbConnection,
  instrumentId: number
) {
  await database.execute("DELETE FROM reference_instruments WHERE id = $1", [
    instrumentId,
  ]);
}

export async function countJobsUsingInstrumentLabel(
  database: DbConnection,
  instrumentLabel: string
) {
  const rows = await database.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM calibration_jobs WHERE reference_instrument = $1",
    [instrumentLabel]
  );

  return Number(rows[0]?.count ?? 0);
}
