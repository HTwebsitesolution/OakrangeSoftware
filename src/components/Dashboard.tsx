import type { FormEvent } from "react";
import {
  CALIBRATION_TEMPLATES,
  formatTestPointSummary,
  hasRequiredTestPoints,
  showsPrototypeRulesNotice,
} from "../calibrationTemplates";
import {
  formatInstrumentLabel,
  getInstrumentValidity,
} from "../referenceInstruments";
import { formatRulesSourceLabel } from "../utils";
import type { CalibrationJob, CalibrationTemplate, ReferenceInstrument } from "../types";

type DashboardProps = {
  jobs: CalibrationJob[];
  error: string;
  showForm: boolean;
  onToggleForm: () => void;
  onOpenReferenceInstruments: () => void;
  onOpenJob: (job: CalibrationJob) => void;
  onSaveJob: (event: FormEvent<HTMLFormElement>) => void;
  referenceInstruments: ReferenceInstrument[];
  selectedTemplate: CalibrationTemplate | undefined;
  selectedInstrumentExpired: boolean;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  siteName: string;
  onSiteNameChange: (value: string) => void;
  toolId: string;
  onToolIdChange: (value: string) => void;
  toolType: string;
  onToolTypeChange: (value: string) => void;
  engineerName: string;
  onEngineerNameChange: (value: string) => void;
  calibrationDate: string;
  onCalibrationDateChange: (value: string) => void;
  temperature: string;
  onTemperatureChange: (value: string) => void;
  humidity: string;
  onHumidityChange: (value: string) => void;
  referenceInstrument: string;
  onReferenceInstrumentChange: (value: string) => void;
  adjustmentMade: string;
  onAdjustmentMadeChange: (value: string) => void;
  engineerNotes: string;
  onEngineerNotesChange: (value: string) => void;
};

export default function Dashboard({
  jobs,
  error,
  showForm,
  onToggleForm,
  onOpenReferenceInstruments,
  onOpenJob,
  onSaveJob,
  referenceInstruments,
  selectedTemplate,
  selectedInstrumentExpired,
  customerName,
  onCustomerNameChange,
  siteName,
  onSiteNameChange,
  toolId,
  onToolIdChange,
  toolType,
  onToolTypeChange,
  engineerName,
  onEngineerNameChange,
  calibrationDate,
  onCalibrationDateChange,
  temperature,
  onTemperatureChange,
  humidity,
  onHumidityChange,
  referenceInstrument,
  onReferenceInstrumentChange,
  adjustmentMade,
  onAdjustmentMadeChange,
  engineerNotes,
  onEngineerNotesChange,
}: DashboardProps) {
  return (
    <main className="app-shell">
      <section className="dashboard-card">
        <p className="eyebrow">Oakrange Engineering</p>

        <h1>Oakrange Calibration Software</h1>

        <p className="subtitle">Engineer Desktop App</p>

        <div className="button-grid">
          <button type="button" onClick={onToggleForm}>
            New Calibration Job
          </button>

          <button type="button">Saved Offline Jobs: {jobs.length}</button>

          <button type="button" onClick={onOpenReferenceInstruments}>
            Reference Instruments: {referenceInstruments.length}
          </button>

          <button type="button">Sync Status: Offline</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {showForm && (
          <form className="job-form" onSubmit={onSaveJob}>
            <h2>New Calibration Job</h2>

            <label>
              Customer Name
              <input
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder="e.g. Oakrange Customer"
              />
            </label>

            <label>
              Site Name
              <input
                value={siteName}
                onChange={(event) => onSiteNameChange(event.target.value)}
                placeholder="e.g. Main Workshop"
              />
            </label>

            <label>
              Tool ID
              <input
                value={toolId}
                onChange={(event) => onToolIdChange(event.target.value)}
                placeholder="e.g. TW-001"
              />
            </label>

            <label>
              Tool Type
              <select
                value={toolType}
                onChange={(event) => onToolTypeChange(event.target.value)}
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
                <span>
                  Rules: {formatRulesSourceLabel(selectedTemplate.rulesSource)}
                </span>

                {hasRequiredTestPoints(selectedTemplate) ? (
                  <span>
                    Required test points:{" "}
                    {selectedTemplate.testPoints
                      .filter((point) => point.required !== false)
                      .map((point) => formatTestPointSummary(point))
                      .join("; ")}
                  </span>
                ) : (
                  <span>
                    No required test points — manual readings can be entered on
                    the job.
                  </span>
                )}

                {showsPrototypeRulesNotice(selectedTemplate) && (
                  <p className="prototype-rules-notice">
                    Prototype / demo template values only. Replace with official
                    Oakrange calibration rules when supplied.
                  </p>
                )}
              </div>
            )}

            <label>
              Engineer Name
              <input
                value={engineerName}
                onChange={(event) => onEngineerNameChange(event.target.value)}
                placeholder="e.g. Luke"
              />
            </label>

            <label>
              Calibration Date
              <input
                type="date"
                value={calibrationDate}
                onChange={(event) =>
                  onCalibrationDateChange(event.target.value)
                }
              />
            </label>

            <label>
              Temperature
              <input
                value={temperature}
                onChange={(event) => onTemperatureChange(event.target.value)}
                placeholder="e.g. 20 °C"
              />
            </label>

            <label>
              Humidity
              <input
                value={humidity}
                onChange={(event) => onHumidityChange(event.target.value)}
                placeholder="e.g. 45%"
              />
            </label>

            <label>
              Reference Instrument
              <select
                value={referenceInstrument}
                onChange={(event) =>
                  onReferenceInstrumentChange(event.target.value)
                }
              >
                <option value="">Select reference instrument...</option>
                {referenceInstruments.map((instrument) => {
                  const label = formatInstrumentLabel(instrument);
                  const validity = getInstrumentValidity(
                    instrument.calibration_due_date
                  );

                  return (
                    <option key={instrument.id} value={label}>
                      {label} ({validity})
                    </option>
                  );
                })}
              </select>
            </label>

            {selectedInstrumentExpired && (
              <p className="instrument-warning-strong full-width-field">
                Expired reference instrument selected. This instrument should be
                replaced or re-calibrated before use. You will be asked to
                confirm before saving this job.
              </p>
            )}

            <label className="full-width-field">
              Adjustment Made
              <textarea
                value={adjustmentMade}
                onChange={(event) => onAdjustmentMadeChange(event.target.value)}
                placeholder="e.g. No adjustment made / Adjusted before final readings"
              />
            </label>

            <label className="full-width-field">
              Engineer Notes
              <textarea
                value={engineerNotes}
                onChange={(event) => onEngineerNotesChange(event.target.value)}
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
                  onClick={() => onOpenJob(job)}
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
                    <span>
                      {job.status === "Saved Offline" ? "Draft" : job.status}
                    </span>
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
