import type { FormEvent } from "react";
import {
  formatDisplayDate,
  formatInstrumentLabel,
  getInstrumentValidity,
} from "../referenceInstruments";
import type { ReferenceInstrument } from "../types";

type ReferenceInstrumentsProps = {
  error: string;
  referenceInstruments: ReferenceInstrument[];
  editingInstrumentId: number | null;
  instrumentName: string;
  onInstrumentNameChange: (value: string) => void;
  certificateNumber: string;
  onCertificateNumberChange: (value: string) => void;
  calibrationDueDate: string;
  onCalibrationDueDateChange: (value: string) => void;
  getInstrumentJobUsageCount: (instrument: ReferenceInstrument) => number;
  onBack: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onStartEdit: (instrument: ReferenceInstrument) => void;
  onCancelEdit: () => void;
  onDelete: (instrument: ReferenceInstrument) => void;
};

export default function ReferenceInstruments({
  error,
  referenceInstruments,
  editingInstrumentId,
  instrumentName,
  onInstrumentNameChange,
  certificateNumber,
  onCertificateNumberChange,
  calibrationDueDate,
  onCalibrationDueDateChange,
  getInstrumentJobUsageCount,
  onBack,
  onSave,
  onStartEdit,
  onCancelEdit,
  onDelete,
}: ReferenceInstrumentsProps) {
  const isEditing = editingInstrumentId !== null;

  return (
    <main className="app-shell">
      <section className="dashboard-card">
        <p className="eyebrow">Oakrange Engineering</p>

        <h1>Reference Instruments</h1>

        <p className="subtitle">
          Local register of calibration reference instruments
        </p>

        <div className="top-action-row">
          <button type="button" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form className="job-form" onSubmit={onSave}>
          <h2>
            {isEditing ? "Edit Reference Instrument" : "Add Reference Instrument"}
          </h2>

          <label>
            Instrument Name
            <input
              value={instrumentName}
              onChange={(event) => onInstrumentNameChange(event.target.value)}
              placeholder="e.g. Torque Reference Instrument"
            />
          </label>

          <label>
            Certificate Number
            <input
              value={certificateNumber}
              onChange={(event) =>
                onCertificateNumberChange(event.target.value)
              }
              placeholder="e.g. REF-TW-001"
            />
          </label>

          <label>
            Calibration Due Date
            <input
              type="date"
              value={calibrationDueDate}
              onChange={(event) =>
                onCalibrationDueDateChange(event.target.value)
              }
            />
          </label>

          <div className="form-action-row">
            <button type="submit">
              {isEditing
                ? "Save Reference Instrument"
                : "Add Reference Instrument"}
            </button>

            {isEditing && (
              <button
                type="button"
                className="secondary-button"
                onClick={onCancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="jobs-list">
          <h2>Saved Reference Instruments</h2>

          {referenceInstruments.length === 0 ? (
            <p className="empty-state">
              No reference instruments saved yet. Add one above to use it in
              calibration jobs.
            </p>
          ) : (
            <div className="instruments-table">
              <div className="instruments-header instruments-header-with-actions">
                <span>Name</span>
                <span>Certificate</span>
                <span>Due Date</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {referenceInstruments.map((instrument) => {
                const validity = getInstrumentValidity(
                  instrument.calibration_due_date
                );
                const usageCount = getInstrumentJobUsageCount(instrument);
                const isRowEditing = editingInstrumentId === instrument.id;

                return (
                  <article
                    key={instrument.id}
                    className={
                      isRowEditing
                        ? "instruments-row instruments-row-editing"
                        : "instruments-row instruments-row-with-actions"
                    }
                  >
                    <span>{instrument.name}</span>
                    <span>{instrument.certificate_number}</span>
                    <span>
                      {formatDisplayDate(instrument.calibration_due_date)}
                    </span>
                    <span
                      className={
                        validity === "Valid"
                          ? "badge badge-valid"
                          : "badge badge-expired"
                      }
                    >
                      {validity}
                    </span>
                    <span className="reading-actions">
                      <button
                        type="button"
                        className="small-button secondary-button"
                        onClick={() => onStartEdit(instrument)}
                        disabled={isEditing && !isRowEditing}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="small-button danger-button"
                        onClick={() => onDelete(instrument)}
                        disabled={isEditing}
                        title={
                          usageCount > 0
                            ? `Used by ${usageCount} saved job(s)`
                            : "Delete reference instrument"
                        }
                      >
                        Delete
                      </button>
                    </span>
                    {usageCount > 0 && (
                      <span className="instrument-usage-note full-width-field">
                        Used by {usageCount} saved job
                        {usageCount === 1 ? "" : "s"} (
                        {formatInstrumentLabel(instrument)})
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
