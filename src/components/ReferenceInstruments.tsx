import type { FormEvent } from "react";
import {
  formatDisplayDate,
  getInstrumentValidity,
} from "../referenceInstruments";
import type { ReferenceInstrument } from "../types";

type ReferenceInstrumentsProps = {
  error: string;
  referenceInstruments: ReferenceInstrument[];
  instrumentName: string;
  onInstrumentNameChange: (value: string) => void;
  certificateNumber: string;
  onCertificateNumberChange: (value: string) => void;
  calibrationDueDate: string;
  onCalibrationDueDateChange: (value: string) => void;
  onBack: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ReferenceInstruments({
  error,
  referenceInstruments,
  instrumentName,
  onInstrumentNameChange,
  certificateNumber,
  onCertificateNumberChange,
  calibrationDueDate,
  onCalibrationDueDateChange,
  onBack,
  onSave,
}: ReferenceInstrumentsProps) {
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
          <h2>Add Reference Instrument</h2>

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

          <button type="submit">Save Reference Instrument</button>
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
              <div className="instruments-header">
                <span>Name</span>
                <span>Certificate</span>
                <span>Due Date</span>
                <span>Status</span>
              </div>

              {referenceInstruments.map((instrument) => {
                const validity = getInstrumentValidity(
                  instrument.calibration_due_date
                );

                return (
                  <article key={instrument.id} className="instruments-row">
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
