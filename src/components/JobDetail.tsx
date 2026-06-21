import type { FormEvent } from "react";
import {
  findTestPointForLabel,
  formatNominalDisplay,
  formatToleranceDisplay,
  getReadingForPoint,
  hasRequiredTestPoints,
  showsPrototypeRulesNotice,
} from "../calibrationTemplates";
import { displayValue, formatRulesSourceLabel, getResultClass } from "../utils";
import type {
  CalibrationJob,
  CalibrationReading,
  CalibrationTemplate,
  CalibrationTestPoint,
} from "../types";

type JobDetailProps = {
  job: CalibrationJob;
  readings: CalibrationReading[];
  error: string;
  template: CalibrationTemplate | undefined;
  isJobLocked: boolean;
  requiredPoints: CalibrationTestPoint[];
  completedRequiredPoints: CalibrationTestPoint[];
  missingRequiredPoints: CalibrationTestPoint[];
  allRequiredPointsCompleted: boolean;
  canMarkReadyForReview: boolean;
  testPoint: string;
  actualReading: string;
  errorValue: string;
  result: string;
  editingReadingId: number | null;
  onBack: () => void;
  onTestPointChange: (value: string) => void;
  onActualReadingChange: (value: string) => void;
  onErrorValueChange: (value: string) => void;
  onResultChange: (value: string) => void;
  onApplyTestPoint: (point: CalibrationTestPoint) => void;
  onSaveReading: (event: FormEvent<HTMLFormElement>) => void;
  onResetReadingForm: () => void;
  onEditReading: (reading: CalibrationReading) => void;
  onDeleteReading: (reading: CalibrationReading) => void;
  onMarkReadyForReview: () => void;
  onReturnToDraft: () => void;
};

export default function JobDetail({
  job,
  readings,
  error,
  template,
  isJobLocked,
  requiredPoints,
  completedRequiredPoints,
  missingRequiredPoints,
  allRequiredPointsCompleted,
  canMarkReadyForReview,
  testPoint,
  actualReading,
  errorValue,
  result,
  editingReadingId,
  onBack,
  onTestPointChange,
  onActualReadingChange,
  onErrorValueChange,
  onResultChange,
  onApplyTestPoint,
  onSaveReading,
  onResetReadingForm,
  onEditReading,
  onDeleteReading,
  onMarkReadyForReview,
  onReturnToDraft,
}: JobDetailProps) {
  return (
    <main className="app-shell">
      <section className="dashboard-card">
        <p className="eyebrow">Oakrange Engineering</p>

        <h1>Job Detail</h1>

        <div className="top-action-row">
          <button type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>

        <div className="detail-grid">
          <div>
            <span>Customer</span>
            <strong>{job.customer_name}</strong>
          </div>

          <div>
            <span>Site</span>
            <strong>{job.site_name}</strong>
          </div>

          <div>
            <span>Tool ID</span>
            <strong>{job.tool_id}</strong>
          </div>

          <div>
            <span>Tool Type</span>
            <strong>{job.tool_type}</strong>
          </div>

          <div>
            <span>Engineer</span>
            <strong>{job.engineer_name}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{job.status}</strong>
          </div>

          <div>
            <span>Calibration Date</span>
            <strong>{displayValue(job.calibration_date)}</strong>
          </div>

          <div>
            <span>Reference Instrument</span>
            <strong>{displayValue(job.reference_instrument)}</strong>
          </div>

          <div>
            <span>Temperature</span>
            <strong>{displayValue(job.temperature)}</strong>
          </div>

          <div>
            <span>Humidity</span>
            <strong>{displayValue(job.humidity)}</strong>
          </div>
        </div>

        <section className="metadata-panel">
          <h2>Environmental / Engineer Notes</h2>

          <div className="metadata-grid">
            <div>
              <span>Adjustment Made</span>
              <strong>{displayValue(job.adjustment_made)}</strong>
            </div>

            <div>
              <span>Engineer Notes</span>
              <strong>{displayValue(job.engineer_notes)}</strong>
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

        {template && (
          <section className="template-panel">
            <h2>Calibration Template</h2>

            <p>
              <strong>{template.toolType}</strong> template selected. Unit:{" "}
              <strong>{template.unit}</strong>. Rules:{" "}
              <strong>{formatRulesSourceLabel(template.rulesSource)}</strong>
            </p>

            {showsPrototypeRulesNotice(template) && (
              <p className="prototype-rules-notice">
                Prototype / demo template values only. These nominal values and
                tolerances are for development and testing — not official
                Oakrange calibration rules.
              </p>
            )}

            {hasRequiredTestPoints(template) ? (
              <>
                <div className="completion-panel">
                  <strong>
                    Required test point progress:{" "}
                    {completedRequiredPoints.length} / {requiredPoints.length}
                  </strong>

                  {allRequiredPointsCompleted ? (
                    <span className="completion-good">
                      All required test points are complete.
                    </span>
                  ) : (
                    <span className="completion-warning">
                      Missing required points:{" "}
                      {missingRequiredPoints
                        .map((point) => point.label)
                        .join(", ")}
                    </span>
                  )}
                </div>

                <p className="helper-text">
                  Select a required test point to pre-fill the reading form.
                  Each point shows expected/nominal value, tolerance, and unit.
                  Completed points are locked to prevent duplicate readings.
                  Manual readings can still be entered for points not listed
                  below.
                </p>

                <div className="suggested-point-buttons">
                  {template.testPoints.map((point) => {
                    const existingReading = getReadingForPoint(
                      readings,
                      point.label
                    );
                    const isRequired = point.required !== false;

                    return (
                      <button
                        key={point.label}
                        type="button"
                        className={
                          existingReading
                            ? "chip-button chip-button-complete"
                            : "chip-button"
                        }
                        onClick={() => onApplyTestPoint(point)}
                        disabled={Boolean(existingReading) || isJobLocked}
                      >
                        <span>
                          {point.label}
                          {!isRequired ? " (optional)" : ""}
                        </span>
                        <small>
                          Expected/Nominal {formatNominalDisplay(point)} |
                          Tolerance {formatToleranceDisplay(point)}
                        </small>
                        {existingReading && <small>Completed</small>}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="helper-text">
                No required test points for this tool type. Enter manual
                readings below — error and result must be set by the engineer.
              </p>
            )}
          </section>
        )}

        {error && <p className="error-message">{error}</p>}

        <form className="job-form" onSubmit={onSaveReading}>
          <h2>
            {editingReadingId
              ? "Edit Calibration Reading"
              : "Add Calibration Reading"}
          </h2>

          <label>
            Test Point
            <input
              value={testPoint}
              onChange={(event) => onTestPointChange(event.target.value)}
              placeholder="e.g. 20 Nm"
              disabled={isJobLocked}
            />
          </label>

          <label>
            Actual Reading
            <input
              value={actualReading}
              onChange={(event) => onActualReadingChange(event.target.value)}
              placeholder="e.g. 20.1 Nm"
              disabled={isJobLocked}
            />
          </label>

          <label>
            Error
            <input
              value={errorValue}
              onChange={(event) => onErrorValueChange(event.target.value)}
              placeholder="Auto-calculated where possible"
              disabled={isJobLocked}
            />
          </label>

          <label>
            Result
            <select
              value={result}
              onChange={(event) => onResultChange(event.target.value)}
              disabled={isJobLocked}
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Adjusted">Adjusted</option>
            </select>
          </label>

          <p className="calculation-note">
            When a test point matches a template rule, the app calculates Error
            as Actual Reading minus Expected/Nominal value, then sets Pass or
            Fail using the template tolerance. Manual readings without a
            matching rule must have error and result entered by the engineer.
          </p>

          <div className="form-action-row">
            <button type="submit" disabled={isJobLocked}>
              {editingReadingId ? "Update Reading" : "Save Reading Offline"}
            </button>

            {editingReadingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={onResetReadingForm}
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
                <span>Expected/Nominal</span>
                <span>Tolerance</span>
                <span>Actual</span>
                <span>Error</span>
                <span>Result</span>
                <span>Actions</span>
              </div>

              {readings.map((reading) => {
                const templatePoint = findTestPointForLabel(
                  template,
                  reading.test_point
                );

                return (
                  <article
                    key={reading.id}
                    className="readings-row readings-row-with-actions"
                  >
                    <span>{reading.test_point}</span>
                    <span>
                      {templatePoint
                        ? formatNominalDisplay(templatePoint)
                        : "Manual"}
                    </span>
                    <span>
                      {templatePoint
                        ? formatToleranceDisplay(templatePoint)
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
                        onClick={() => onEditReading(reading)}
                        disabled={isJobLocked}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="small-button danger-button"
                        onClick={() => onDeleteReading(reading)}
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
            <button type="button" onClick={onReturnToDraft}>
              Return to Draft
            </button>
          ) : (
            <button
              type="button"
              onClick={onMarkReadyForReview}
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

          <button type="button" onClick={onBack}>
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
