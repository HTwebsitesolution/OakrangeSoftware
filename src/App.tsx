import { useEffect, useState, type FormEvent } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import JobDetail from "./components/JobDetail";
import ReferenceInstrumentsScreen from "./components/ReferenceInstruments";
import {
  calculateErrorAndResult,
  getReadingForPoint,
  getTemplate,
  normaliseText,
} from "./calibrationTemplates";
import {
  fetchJobs,
  fetchReadings,
  fetchReferenceInstruments,
  setupDatabase,
} from "./db";
import {
  formatInstrumentLabel,
  isInstrumentExpired,
} from "./referenceInstruments";
import type {
  CalibrationJob,
  CalibrationReading,
  CalibrationTestPoint,
  DbConnection,
  ReferenceInstrument,
} from "./types";

function App() {
  const [db, setDb] = useState<DbConnection | null>(null);
  const [jobs, setJobs] = useState<CalibrationJob[]>([]);
  const [readings, setReadings] = useState<CalibrationReading[]>([]);
  const [selectedJob, setSelectedJob] = useState<CalibrationJob | null>(null);

  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [showReferenceInstruments, setShowReferenceInstruments] =
    useState(false);
  const [referenceInstruments, setReferenceInstruments] = useState<
    ReferenceInstrument[]
  >([]);

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

  const [instrumentName, setInstrumentName] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [calibrationDueDate, setCalibrationDueDate] = useState("");

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

  const canMarkReadyForReview =
    allRequiredPointsCompleted && readings.length > 0;

  const selectedReferenceInstrument = referenceInstruments.find(
    (instrument) =>
      formatInstrumentLabel(instrument) === referenceInstrument
  );
  const selectedInstrumentExpired = selectedReferenceInstrument
    ? isInstrumentExpired(selectedReferenceInstrument.calibration_due_date)
    : false;

  async function loadJobs(database: DbConnection) {
    const savedJobs = await fetchJobs(database);
    setJobs(savedJobs);
  }

  async function loadReadings(database: DbConnection, jobId: number) {
    const savedReadings = await fetchReadings(database, jobId);
    setReadings(savedReadings);
  }

  async function loadReferenceInstruments(database: DbConnection) {
    const savedInstruments = await fetchReferenceInstruments(database);
    setReferenceInstruments(savedInstruments);
  }

  useEffect(() => {
    async function initDatabase() {
      try {
        const database = await setupDatabase();
        setDb(database);
        await loadJobs(database);
        await loadReferenceInstruments(database);
      } catch (err) {
        setError(String(err));
      }
    }

    initDatabase();
  }, []);

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

    const calculation = calculateErrorAndResult(
      selectedJobTemplate,
      point.label,
      actualReading
    );

    if (calculation) {
      setErrorValue(calculation.errorText);
      setResult(calculation.resultText);
    }
  }

  function handleTestPointChange(value: string) {
    setTestPoint(value);

    const calculation = calculateErrorAndResult(
      selectedJobTemplate,
      value,
      actualReading
    );

    if (calculation) {
      setErrorValue(calculation.errorText);
      setResult(calculation.resultText);
    }
  }

  function handleActualReadingChange(value: string) {
    setActualReading(value);

    const calculation = calculateErrorAndResult(
      selectedJobTemplate,
      testPoint,
      value
    );

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
      setError(
        "This job is Ready for Review. Return it to Draft before editing."
      );
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
      setError(
        "This job is Ready for Review. Return it to Draft before deleting."
      );
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
      await updateSelectedJobStatus(
        remainingCount > 0 ? "In Progress" : "Draft"
      );

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
      setError(
        "This job is Ready for Review. Return it to Draft before editing."
      );
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

  async function saveReferenceInstrument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!db) {
      setError("Database is not ready yet.");
      return;
    }

    if (!instrumentName || !certificateNumber || !calibrationDueDate) {
      setError(
        "Please complete instrument name, certificate number, and calibration due date."
      );
      return;
    }

    try {
      await db.execute(
        `
        INSERT INTO reference_instruments (
          name,
          certificate_number,
          calibration_due_date,
          created_at
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          instrumentName,
          certificateNumber,
          calibrationDueDate,
          new Date().toISOString(),
        ]
      );

      setInstrumentName("");
      setCertificateNumber("");
      setCalibrationDueDate("");
      setError("");

      await loadReferenceInstruments(db);
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

  if (showReferenceInstruments) {
    return (
      <ReferenceInstrumentsScreen
        error={error}
        referenceInstruments={referenceInstruments}
        instrumentName={instrumentName}
        onInstrumentNameChange={setInstrumentName}
        certificateNumber={certificateNumber}
        onCertificateNumberChange={setCertificateNumber}
        calibrationDueDate={calibrationDueDate}
        onCalibrationDueDateChange={setCalibrationDueDate}
        onBack={() => {
          setShowReferenceInstruments(false);
          setError("");
        }}
        onSave={saveReferenceInstrument}
      />
    );
  }

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        readings={readings}
        error={error}
        template={selectedJobTemplate}
        isJobLocked={isJobLocked}
        requiredPoints={requiredPoints}
        completedRequiredPoints={completedRequiredPoints}
        missingRequiredPoints={missingRequiredPoints}
        allRequiredPointsCompleted={allRequiredPointsCompleted}
        canMarkReadyForReview={canMarkReadyForReview}
        testPoint={testPoint}
        actualReading={actualReading}
        errorValue={errorValue}
        result={result}
        editingReadingId={editingReadingId}
        onBack={() => setSelectedJob(null)}
        onTestPointChange={handleTestPointChange}
        onActualReadingChange={handleActualReadingChange}
        onErrorValueChange={setErrorValue}
        onResultChange={setResult}
        onApplyTestPoint={applyTestPoint}
        onSaveReading={saveReading}
        onResetReadingForm={resetReadingForm}
        onEditReading={editReading}
        onDeleteReading={deleteReading}
        onMarkReadyForReview={markReadyForReview}
        onReturnToDraft={returnToDraft}
      />
    );
  }

  return (
    <Dashboard
      jobs={jobs}
      error={error}
      showForm={showForm}
      onToggleForm={() => setShowForm(!showForm)}
      onOpenReferenceInstruments={() => {
        setShowReferenceInstruments(true);
        setShowForm(false);
        setError("");
      }}
      onOpenJob={openJob}
      onSaveJob={saveJob}
      referenceInstruments={referenceInstruments}
      selectedTemplate={selectedTemplate}
      selectedInstrumentExpired={selectedInstrumentExpired}
      customerName={customerName}
      onCustomerNameChange={setCustomerName}
      siteName={siteName}
      onSiteNameChange={setSiteName}
      toolId={toolId}
      onToolIdChange={setToolId}
      toolType={toolType}
      onToolTypeChange={setToolType}
      engineerName={engineerName}
      onEngineerNameChange={setEngineerName}
      calibrationDate={calibrationDate}
      onCalibrationDateChange={setCalibrationDate}
      temperature={temperature}
      onTemperatureChange={setTemperature}
      humidity={humidity}
      onHumidityChange={setHumidity}
      referenceInstrument={referenceInstrument}
      onReferenceInstrumentChange={setReferenceInstrument}
      adjustmentMade={adjustmentMade}
      onAdjustmentMadeChange={setAdjustmentMade}
      engineerNotes={engineerNotes}
      onEngineerNotesChange={setEngineerNotes}
    />
  );
}

export default App;
