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
