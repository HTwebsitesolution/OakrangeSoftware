import { useEffect, useState, type FormEvent } from "react";
import Database from "@tauri-apps/plugin-sql";
import "./App.css";

type CalibrationJob = {
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

type CalibrationReading = {
  id: number;
  job_id: number;
  test_point: string;
  actual_reading: string;
  error_value: string;
  result: string;
  created_at: string;
};

type CalibrationTestPoint = {
  label: string;
  nominalValue: number;
  unit: string;
  tolerance: number;
};

type CalibrationTemplate = {
  toolType: string;
  unit: string;
  testPoints: CalibrationTestPoint[];
};

type DbConnection = Awaited<ReturnType<typeof Database.load>>;

const DB_PATH = "sqlite:oakrange_calibration.db";
const REFERENCE_INSTRUMENTS = [
  "Torque Reference Instrument - REF-TW-001",
  "Pressure Reference Instrument - REF-PG-001",
  "Tyre Inflator Reference Instrument - REF-TI-001",
  "Wheel Balancer Reference Instrument - REF-WB-001",
];

const CALIBRATION_TEMPLATES: CalibrationTemplate[] = [
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

function getTemplate(toolType: string) {
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

function normaliseText(value: string) {
  return value.trim().toLowerCase();
}

function getReadingForPoint(readings: CalibrationReading[], pointLabel: string) {
  return readings.find(
    (reading) => normaliseText(reading.test_point) === normaliseText(pointLabel)
  );
}

function getResultClass(result: string) {
  if (result === "Pass") return "badge badge-pass";
  if (result === "Fail") return "badge badge-fail";
  if (result === "Adjusted") return "badge badge-adjusted";
  return "badge";
}
function displayValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "Not recorded";
}
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

function App() {
  const [db, setDb] = useState<DbConnection | null>(null);
  const [jobs, setJobs] = useState<CalibrationJob[]>([]);
  const [readings, setReadings] = useState<CalibrationReading[]>([]);
  const [selectedJob, setSelectedJob] = useState<CalibrationJob | null>(null);

  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [toolId, setToolId] = useState("");
  const [toolType, setToolType] = useState("");
  const [engineerName, setEngineerName] = useState("");
const [calibrationDate, setCalibrationDate] = useState("");
const [temperature, setTemperature] = useState("");
const [humidity, setHumidity] = useState("");
const [referenceInstrument, setReferenceInstrument] = useState("");
const [adjustmentMade, setAdjustmentMade] = useState("");
const [engineerNotes, setEngineerNotes] = useState("");

  const [testPoint, setTestPoint] = useState("");
  const [actualReading, setActualReading] = useState("");
  const [errorValue, setErrorValue] = useState("");
  const [result, setResult] = useState("Pass");
  const [editingReadingId, setEditingReadingId] = useState<number | null>(null);

  const selectedTemplate = getTemplate(toolType);
  const selectedJobTemplate = selectedJob
    ? getTemplate(selectedJob.tool_type)
    : undefined;

  const isJobLocked = selectedJob?.status === "Ready for Review";

  const requiredPoints = selectedJobTemplate?.testPoints ?? [];
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

  const canMarkReadyForReview = allRequiredPointsCompleted && readings.length > 0;

  async function loadJobs(database: DbConnection) {
    const savedJobs = await database.select<CalibrationJob[]>(
      "SELECT * FROM calibration_jobs ORDER BY id DESC"
    );

    setJobs(savedJobs);
  }

  async function loadReadings(database: DbConnection, jobId: number) {
    const savedReadings = await database.select<CalibrationReading[]>(
      "SELECT * FROM calibration_readings WHERE job_id = $1 ORDER BY id DESC",
      [jobId]
    );

    setReadings(savedReadings);
  }

  useEffect(() => {
    async function setupDatabase() {
      try {
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
await addMissingColumn(
  database,
  "calibration_date",
  "calibration_date TEXT"
);

await addMissingColumn(database, "temperature", "temperature TEXT");

await addMissingColumn(database, "humidity", "humidity TEXT");

await addMissingColumn(
  database,
  "reference_instrument",
  "reference_instrument TEXT"
);

await addMissingColumn(
  database,
  "engineer_notes",
  "engineer_notes TEXT"
);

await addMissingColumn(
  database,
  "adjustment_made",
  "adjustment_made TEXT"
);

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
          UPDATE calibration_jobs
          SET status = 'Draft'
          WHERE status = 'Saved Offline'
        `);

        setDb(database);
        await loadJobs(database);
      } catch (err) {
        setError(String(err));
      }
    }

    setupDatabase();
  }, []);

  function calculateErrorAndResult(pointLabel: string, actualText: string) {
    const matchingPoint = selectedJobTemplate?.testPoints.find(
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

  function resetReadingForm() {
    setTestPoint("");
    setActualReading("");
    setErrorValue("");
    setResult("Pass");
    setEditingReadingId(null);
  }

  function applyTestPoint(point: CalibrationTestPoint) {
    if (isJobLocked) return;

    setTestPoint(point.label);

    const calculation = calculateErrorAndResult(point.label, actualReading);

    if (calculation) {
      setErrorValue(calculation.errorText);
      setResult(calculation.resultText);
    }
  }

  function handleTestPointChange(value: string) {
    setTestPoint(value);

    const calculation = calculateErrorAndResult(value, actualReading);

    if (calculation) {
      setErrorValue(calculation.errorText);
      setResult(calculation.resultText);
    }
  }

  function handleActualReadingChange(value: string) {
    setActualReading(value);

    const calculation = calculateErrorAndResult(testPoint, value);

    if (calculation) {
      setErrorValue(calculation.errorText);
      setResult(calculation.resultText);
    }
  }

  async function updateSelectedJobStatus(status: string) {
    if (!db || !selectedJob) return;

    await db.execute("UPDATE calibration_jobs SET status = $1 WHERE id = $2", [
      status,
      selectedJob.id,
    ]);

    setSelectedJob({
      ...selectedJob,
      status,
    });

    await loadJobs(db);
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!db) {
      setError("Database is not ready yet.");
      return;
    }

    if (
  !customerName ||
  !siteName ||
  !toolId ||
  !toolType ||
  !engineerName ||
  !calibrationDate
) {
  setError(
    "Please complete customer, site, tool, engineer and calibration date."
  );
  return;
}

    try {
      await db.execute(
        `
        INSERT INTO calibration_jobs (
  customer_name,
  site_name,
  tool_id,
  tool_type,
  engineer_name,
  status,
  created_at,
  calibration_date,
  temperature,
  humidity,
  reference_instrument,
  adjustment_made,
  engineer_notes
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
  customerName,
  siteName,
  toolId,
  toolType,
  engineerName,
  "Draft",
  new Date().toISOString(),
  calibrationDate,
  temperature,
  humidity,
  referenceInstrument,
  adjustmentMade,
  engineerNotes,
]
      );

      setCustomerName("");
      setSiteName("");
      setToolId("");
      setToolType("");
      setEngineerName("");
setCalibrationDate("");
setTemperature("");
setHumidity("");
setReferenceInstrument("");
setAdjustmentMade("");
setEngineerNotes("");
      setError("");
      setShowForm(false);

      await loadJobs(db);
    } catch (err) {
      setError(String(err));
    }
  }

  async function openJob(job: CalibrationJob) {
    if (!db) return;

    const cleanedStatus = job.status === "Saved Offline" ? "Draft" : job.status;

    setSelectedJob({
      ...job,
      status: cleanedStatus,
    });

    setError("");
    resetReadingForm();

    await loadReadings(db, job.id);
  }

  function editReading(reading: CalibrationReading) {
    if (isJobLocked) {
      setError("This job is Ready for Review. Return it to Draft before editing.");
      return;
    }

    setEditingReadingId(reading.id);
    setTestPoint(reading.test_point);
    setActualReading(reading.actual_reading);
    setErrorValue(reading.error_value);
    setResult(reading.result);
    setError("");
  }

  async function deleteReading(reading: CalibrationReading) {
    if (!db || !selectedJob) return;

    if (isJobLocked) {
      setError("This job is Ready for Review. Return it to Draft before deleting.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the reading for ${reading.test_point}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await db.execute("DELETE FROM calibration_readings WHERE id = $1", [
        reading.id,
      ]);

      if (editingReadingId === reading.id) {
        resetReadingForm();
      }

      const remainingRows = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM calibration_readings WHERE job_id = $1",
        [selectedJob.id]
      );

      const remainingCount = Number(remainingRows[0]?.count ?? 0);
      await updateSelectedJobStatus(remainingCount > 0 ? "In Progress" : "Draft");

      await loadReadings(db, selectedJob.id);
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }

  async function saveReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!db || !selectedJob) {
      setError("No job selected.");
      return;
    }

    if (isJobLocked) {
      setError("This job is Ready for Review. Return it to Draft before editing.");
      return;
    }

    if (!testPoint || !actualReading || !errorValue || !result) {
      setError("Please complete all reading fields.");
      return;
    }

    const duplicateReading = readings.some(
      (reading) =>
        reading.id !== editingReadingId &&
        normaliseText(reading.test_point) === normaliseText(testPoint)
    );

    if (duplicateReading) {
      setError(
        `A reading already exists for ${testPoint}. Duplicate readings are not allowed.`
      );
      return;
    }

    try {
      if (editingReadingId) {
        await db.execute(
          `
          UPDATE calibration_readings
          SET test_point = $1,
              actual_reading = $2,
              error_value = $3,
              result = $4
          WHERE id = $5
          `,
          [testPoint, actualReading, errorValue, result, editingReadingId]
        );
      } else {
        await db.execute(
          `
          INSERT INTO calibration_readings (
            job_id,
            test_point,
            actual_reading,
            error_value,
            result,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            selectedJob.id,
            testPoint,
            actualReading,
            errorValue,
            result,
            new Date().toISOString(),
          ]
        );
      }

      if (selectedJob.status === "Draft") {
        await updateSelectedJobStatus("In Progress");
      }

      resetReadingForm();
      setError("");

      await loadReadings(db, selectedJob.id);
    } catch (err) {
      setError(String(err));
    }
  }

  async function markReadyForReview() {
    if (!db || !selectedJob) return;

    if (!canMarkReadyForReview) {
      if (missingRequiredPoints.length > 0) {
        setError(
          `This job is not complete. Missing required points: ${missingRequiredPoints
            .map((point) => point.label)
            .join(", ")}.`
        );
      } else {
        setError("This job needs at least one reading before review.");
      }

      return;
    }

    try {
      await updateSelectedJobStatus("Ready for Review");
      resetReadingForm();
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }

  async function returnToDraft() {
    if (!db || !selectedJob) return;

    const confirmed = window.confirm(
      "Return this job to Draft? This will unlock the readings for correction."
    );

    if (!confirmed) return;

    try {
      await updateSelectedJobStatus("Draft");
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }

  if (selectedJob) {
    return (
      <main className="app-shell">
        <section className="dashboard-card">
          <p className="eyebrow">Oakrange Engineering</p>

          <h1>Job Detail</h1>

          <div className="top-action-row">
            <button type="button" onClick={() => setSelectedJob(null)}>
              Back to Dashboard
            </button>
          </div>

          <div className="detail-grid">
  <div>
    <span>Customer</span>
    <strong>{selectedJob.customer_name}</strong>
  </div>

  <div>
    <span>Site</span>
    <strong>{selectedJob.site_name}</strong>
  </div>

  <div>
    <span>Tool ID</span>
    <strong>{selectedJob.tool_id}</strong>
  </div>

  <div>
    <span>Tool Type</span>
    <strong>{selectedJob.tool_type}</strong>
  </div>

  <div>
    <span>Engineer</span>
    <strong>{selectedJob.engineer_name}</strong>
  </div>

  <div>
    <span>Status</span>
    <strong>{selectedJob.status}</strong>
  </div>

  <div>
    <span>Calibration Date</span>
    <strong>{displayValue(selectedJob.calibration_date)}</strong>
  </div>

  <div>
    <span>Reference Instrument</span>
    <strong>{displayValue(selectedJob.reference_instrument)}</strong>
  </div>

  <div>
    <span>Temperature</span>
    <strong>{displayValue(selectedJob.temperature)}</strong>
  </div>

  <div>
    <span>Humidity</span>
    <strong>{displayValue(selectedJob.humidity)}</strong>
  </div>
</div>

<section className="metadata-panel">
  <h2>Environmental / Engineer Notes</h2>

  <div className="metadata-grid">
    <div>
      <span>Adjustment Made</span>
      <strong>{displayValue(selectedJob.adjustment_made)}</strong>
    </div>

    <div>
      <span>Engineer Notes</span>
      <strong>{displayValue(selectedJob.engineer_notes)}</strong>
    </div>
  </div>
</section>

          {isJobLocked && (
            <section className="locked-panel">
              <strong>This job is locked for review.</strong>
              <span>
                Readings cannot be edited or deleted while the job is Ready for
                Review. Return it to Draft if corrections are needed.
              </span>
            </section>
          )}

          {selectedJobTemplate && (
            <section className="template-panel">
              <h2>Calibration Template</h2>

              <p>
                <strong>{selectedJobTemplate.toolType}</strong> template selected.
                Unit: <strong>{selectedJobTemplate.unit}</strong>
              </p>

              {selectedJobTemplate.testPoints.length > 0 ? (
                <>
                  <div className="completion-panel">
                    <strong>
                      Required points completed: {completedRequiredPoints.length} /{" "}
                      {requiredPoints.length}
                    </strong>

                    {allRequiredPointsCompleted ? (
                      <span className="completion-good">
                        All required points are complete.
                      </span>
                    ) : (
                      <span className="completion-warning">
                        Missing:{" "}
                        {missingRequiredPoints
                          .map((point) => point.label)
                          .join(", ")}
                      </span>
                    )}
                  </div>

                  <p className="helper-text">
                    Suggested test points with prototype tolerances. Completed
                    points are locked to prevent duplicate readings.
                  </p>

                  <div className="suggested-point-buttons">
                    {selectedJobTemplate.testPoints.map((point) => {
                      const existingReading = getReadingForPoint(
                        readings,
                        point.label
                      );

                      return (
                        <button
                          key={point.label}
                          type="button"
                          className={
                            existingReading
                              ? "chip-button chip-button-complete"
                              : "chip-button"
                          }
                          onClick={() => applyTestPoint(point)}
                          disabled={Boolean(existingReading) || isJobLocked}
                        >
                          <span>{point.label}</span>
                          <small>
                            Nominal {point.nominalValue} {point.unit} | ±
                            {point.tolerance.toFixed(2)} {point.unit}
                          </small>
                          {existingReading && <small>Completed</small>}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="helper-text">
                  No required test points have been added for this tool type yet.
                </p>
              )}
            </section>
          )}

          {error && <p className="error-message">{error}</p>}

          <form className="job-form" onSubmit={saveReading}>
            <h2>{editingReadingId ? "Edit Calibration Reading" : "Add Calibration Reading"}</h2>

            <label>
              Test Point
              <input
                value={testPoint}
                onChange={(event) => handleTestPointChange(event.target.value)}
                placeholder="e.g. 20 Nm"
                disabled={isJobLocked}
              />
            </label>

            <label>
              Actual Reading
              <input
                value={actualReading}
                onChange={(event) =>
                  handleActualReadingChange(event.target.value)
                }
                placeholder="e.g. 20.1 Nm"
                disabled={isJobLocked}
              />
            </label>

            <label>
              Error
              <input
                value={errorValue}
                onChange={(event) => setErrorValue(event.target.value)}
                placeholder="Auto-calculated where possible"
                disabled={isJobLocked}
              />
            </label>

            <label>
              Result
              <select
                value={result}
                onChange={(event) => setResult(event.target.value)}
                disabled={isJobLocked}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Adjusted">Adjusted</option>
              </select>
            </label>

            <p className="calculation-note">
              For Torque Wrench prototype rules, the app calculates Error as:
              Actual Reading minus Nominal Test Point. It then sets Pass or Fail
              using the prototype tolerance.
            </p>

            <div className="form-action-row">
              <button type="submit" disabled={isJobLocked}>
                {editingReadingId ? "Update Reading" : "Save Reading Offline"}
              </button>

              {editingReadingId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetReadingForm}
                  disabled={isJobLocked}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <section className="jobs-list">
            <h2>Calibration Readings</h2>

            {readings.length === 0 ? (
              <p className="empty-state">No readings added yet.</p>
            ) : (
              <div className="readings-table">
                <div className="readings-header readings-header-with-actions">
                  <span>Test Point</span>
                  <span>Nominal</span>
                  <span>Tolerance</span>
                  <span>Actual</span>
                  <span>Error</span>
                  <span>Result</span>
                  <span>Actions</span>
                </div>

                {readings.map((reading) => {
                  const templatePoint = selectedJobTemplate?.testPoints.find(
                    (point) =>
                      normaliseText(point.label) ===
                      normaliseText(reading.test_point)
                  );

                  return (
                    <article
                      key={reading.id}
                      className="readings-row readings-row-with-actions"
                    >
                      <span>{reading.test_point}</span>
                      <span>
                        {templatePoint
                          ? `${templatePoint.nominalValue} ${templatePoint.unit}`
                          : "Manual"}
                      </span>
                      <span>
                        {templatePoint
                          ? `±${templatePoint.tolerance.toFixed(2)} ${
                              templatePoint.unit
                            }`
                          : "Manual"}
                      </span>
                      <span>{reading.actual_reading}</span>
                      <span>{reading.error_value}</span>
                      <span className={getResultClass(reading.result)}>
                        {reading.result}
                      </span>
                      <span className="reading-actions">
                        <button
                          type="button"
                          className="small-button secondary-button"
                          onClick={() => editReading(reading)}
                          disabled={isJobLocked}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="small-button danger-button"
                          onClick={() => deleteReading(reading)}
                          disabled={isJobLocked}
                        >
                          Delete
                        </button>
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="action-row">
            {isJobLocked ? (
              <button type="button" onClick={returnToDraft}>
                Return to Draft
              </button>
            ) : (
              <button
                type="button"
                onClick={markReadyForReview}
                disabled={!canMarkReadyForReview}
                title={
                  canMarkReadyForReview
                    ? "Ready to submit for office/admin review"
                    : "Complete all required test points before review"
                }
              >
                Mark Ready for Review
              </button>
            )}

            <button type="button" onClick={() => setSelectedJob(null)}>
              Back to Dashboard
            </button>
          </div>

          {!canMarkReadyForReview && !isJobLocked && (
            <p className="review-blocked-message">
              Complete all required test points before marking this job Ready for
              Review.
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="dashboard-card">
        <p className="eyebrow">Oakrange Engineering</p>

        <h1>Oakrange Calibration Software</h1>

        <p className="subtitle">Engineer Desktop App</p>

        <div className="button-grid">
          <button type="button" onClick={() => setShowForm(!showForm)}>
            New Calibration Job
          </button>

          <button type="button">Saved Offline Jobs: {jobs.length}</button>

          <button type="button">Reference Instruments</button>

          <button type="button">Sync Status: Offline</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {showForm && (
          <form className="job-form" onSubmit={saveJob}>
            <h2>New Calibration Job</h2>

            <label>
              Customer Name
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="e.g. Oakrange Customer"
              />
            </label>

            <label>
              Site Name
              <input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                placeholder="e.g. Main Workshop"
              />
            </label>

            <label>
              Tool ID
              <input
                value={toolId}
                onChange={(event) => setToolId(event.target.value)}
                placeholder="e.g. TW-001"
              />
            </label>

            <label>
              Tool Type
              <select
                value={toolType}
                onChange={(event) => setToolType(event.target.value)}
              >
                <option value="">Select a tool type...</option>
                {CALIBRATION_TEMPLATES.map((template) => (
                  <option key={template.toolType} value={template.toolType}>
                    {template.toolType}
                  </option>
                ))}
              </select>
            </label>

            {selectedTemplate && (
              <div className="template-preview">
                <strong>{selectedTemplate.toolType}</strong>
                <span>Unit: {selectedTemplate.unit}</span>

                {selectedTemplate.testPoints.length > 0 ? (
                  <span>
                    Prototype points:{" "}
                    {selectedTemplate.testPoints
                      .map(
                        (point) =>
                          `${point.label} (±${point.tolerance.toFixed(2)} ${
                            point.unit
                          })`
                      )
                      .join(", ")}
                  </span>
                ) : (
                  <span>No suggested test points added yet.</span>
                )}
              </div>
            )}

            <label>
              Engineer Name
              <input
                value={engineerName}
                onChange={(event) => setEngineerName(event.target.value)}
                placeholder="e.g. Luke"
              />
            </label>
<label>
  Calibration Date
  <input
    type="date"
    value={calibrationDate}
    onChange={(event) => setCalibrationDate(event.target.value)}
  />
</label>

<label>
  Temperature
  <input
    value={temperature}
    onChange={(event) => setTemperature(event.target.value)}
    placeholder="e.g. 20 °C"
  />
</label>

<label>
  Humidity
  <input
    value={humidity}
    onChange={(event) => setHumidity(event.target.value)}
    placeholder="e.g. 45%"
  />
</label>

<label>
  Reference Instrument
  <select
    value={referenceInstrument}
    onChange={(event) => setReferenceInstrument(event.target.value)}
  >
    <option value="">Select reference instrument...</option>
    {REFERENCE_INSTRUMENTS.map((instrument) => (
      <option key={instrument} value={instrument}>
        {instrument}
      </option>
    ))}
  </select>
</label>

<label className="full-width-field">
  Adjustment Made
  <textarea
    value={adjustmentMade}
    onChange={(event) => setAdjustmentMade(event.target.value)}
    placeholder="e.g. No adjustment made / Adjusted before final readings"
  />
</label>

<label className="full-width-field">
  Engineer Notes
  <textarea
    value={engineerNotes}
    onChange={(event) => setEngineerNotes(event.target.value)}
    placeholder="Any notes about condition, access, environment, or engineer observations"
  />
</label>

            <button type="submit">Save Offline</button>
          </form>
        )}

        <section className="jobs-list">
          <h2>Saved Offline Jobs</h2>

          {jobs.length === 0 ? (
            <p className="empty-state">No jobs saved yet.</p>
          ) : (
            <div className="job-table">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className="job-row job-row-button"
                  onClick={() => openJob(job)}
                >
                  <div>
                    <strong>{job.customer_name}</strong>
                    <span>{job.site_name}</span>
                  </div>

                  <div>
                    <strong>{job.tool_id}</strong>
                    <span>{job.tool_type}</span>
                  </div>

                  <div>
                    <strong>{job.engineer_name}</strong>
                    <span>{job.status === "Saved Offline" ? "Draft" : job.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;