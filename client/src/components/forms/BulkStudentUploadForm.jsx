import { X, Upload, FileSpreadsheet, Images } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  bulkUploadStudentsExcel,
  bulkUploadStudentPhotosZip,
  fetchBulkStudentUploadRules,
  downloadBulkStudentUploadTemplate,
} from "../../api/student.api";

const BulkStudentUploadForm = ({ isOpen, onClose, classroomId, onUploaded, mode = "excel" }) => {
  const [excel, setExcel] = useState(null);
  const [zip, setZip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rules, setRules] = useState(null);
  const [rulesError, setRulesError] = useState("");

  const title = useMemo(() => (mode === "zip" ? "Bulk Upload Photos" : "Bulk Upload Students"), [mode]);
  const description = useMemo(
    () => (mode === "zip" ? "Upload ZIP file containing student photos." : "Upload Excel sheet with student details."),
    [mode]
  );

  const excelSummary = useMemo(() => {
    if (mode !== "excel" || !result) return null;
    const list = Array.isArray(result?.results) ? result.results : [];
    const failedRows = list.filter((x) => x?.success === false);
    const okRows = list.filter((x) => x?.success === true);
    return {
      uploaded: Number(result?.uploaded || 0),
      failedCount: failedRows.length,
      okCount: okRows.length,
      failedRows,
      fileUrl: result?.fileUrl,
    };
  }, [mode, result]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!classroomId) {
      setError("Missing classroom context");
      return;
    }

    if (mode === "excel" && !excel) {
      setError("Please select an Excel file (.xlsx) first.");
      return;
    }

    if (mode === "zip" && !zip) {
      setError("Please select a Photos ZIP file (.zip). Upload Excel first.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "excel") {
        const r = await bulkUploadStudentsExcel({ classId: classroomId, file: excel });
        setResult(r);

        // If at least one row inserted, refresh parent list.
        const uploaded = Number(r?.uploaded || 0);
        if (uploaded > 0) await onUploaded?.();

        // Keep modal open if any row failed, so the user can read errors.
        const list = Array.isArray(r?.results) ? r.results : [];
        const failedCount = list.filter((x) => x?.success === false).length;
        if (failedCount === 0) onClose?.();
      } else {
        const r = await bulkUploadStudentPhotosZip({ classId: classroomId, file: zip });
        setResult(r);
        await onUploaded?.();
        onClose?.();
      }
    } catch (err) {
      setError(err?.message || "Bulk upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openRules = async () => {
    setRulesOpen(true);
    setRulesError("");
    if (rules || rulesLoading) return;

    setRulesLoading(true);
    try {
      const r = await fetchBulkStudentUploadRules();
      setRules(r);
    } catch (err) {
      setRulesError(err?.message || "Failed to load rules");
    } finally {
      setRulesLoading(false);
    }
  };

  const downloadTemplate = async () => {
    setError("");
    try {
      await downloadBulkStudentUploadTemplate();
    } catch (err) {
      setError(err?.message || "Template download failed");
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <Motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 sm:backdrop-blur-sm bg-[rgb(var(--primary-text-rgb)/0.5)] w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Motion.div
            className="bg-(--primary-bg) w-full max-w-md rounded-3xl sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden border border-[rgb(var(--primary-accent-rgb)/0.1)] max-h-[92vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="bg-(--primary-accent) p-4 sm:p-6 flex justify-between items-center text-(--primary-bg)">
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
                <p className="text-(--secondary-accent) text-xs sm:text-sm opacity-90">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-red-500 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto" onSubmit={submit}>
              {error && (
                <div className="text-sm font-semibold rounded-xl px-4 py-3 bg-red-50 text-red-700">
                  {error}
                </div>
              )}

              {mode === "excel" ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-(--primary-accent)">Excel File (.xlsx)</label>
                  <div className="relative">
                    <FileSpreadsheet
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--primary-accent-rgb)/0.4)]"
                    />
                    <input
                      type="file"
                      className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2 px-3 text-sm text-(--primary-text) pl-10 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-(--primary-accent) file:text-(--primary-bg) hover:file:opacity-80"
                      accept=".xlsx,.xls"
                      onChange={(e) => setExcel(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={openRules}
                      className="text-xs font-semibold text-(--primary-accent) hover:underline"
                    >
                      View Excel rules
                    </button>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="text-xs font-semibold text-(--primary-accent) hover:underline"
                    >
                      Download template
                    </button>
                  </div>

                  <li className="text-xs text-red-600 opacity-60 ml-1">
                    Upload Excel first to create student records, then upload ZIP for photos.
                  </li>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-(--primary-accent)">Photos ZIP (.zip)</label>
                  <div className="relative">
                    <Images
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--primary-accent-rgb)/0.4)]"
                    />
                    <input
                      type="file"
                      className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2 px-3 text-sm text-(--primary-text) pl-10 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-(--primary-accent) file:text-(--primary-bg) hover:file:opacity-80"
                      accept=".zip"
                      onChange={(e) => setZip(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <li className="text-xs text-red-600 opacity-60 ml-1">
                    ZIP must contain images named by rollNumber (e.g., 101.jpg).
                  </li>
                  <li className="text-xs text-red-600 opacity-60 ml-1">
                    ZIP folder name must be the same as the classroom name(e.g., "10-A").
                  </li>
                </div>
              )}

              <button
                disabled={submitting}
                className="w-full mt-2 sm:mt-4 bg-(--primary-accent) disabled:opacity-60 text-(--primary-bg) p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-(--primary-text) transition-all shadow-[0_10px_15px_-3px_rgb(var(--primary-accent-rgb)/0.2)] hover:-translate-y-0.5"
              >
                <Upload size={18} /> {submitting ? "Uploading..." : "Upload"}
              </button>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.1)] text-(--primary-accent) font-semibold hover:bg-red-500 hover:text-white transition-colors"
                >
                  {result ? "Close" : "Cancel"}
                </button>
              </div>

              {result && mode === "excel" ? (
                <div className="space-y-2">
                  <div className="text-xs rounded-xl px-4 py-3 bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)]">
                    <div className="font-bold text-(--primary-text)">Upload summary</div>
                    <div className="opacity-80 mt-1">
                      Uploaded: <span className="font-semibold">{excelSummary?.uploaded ?? 0}</span>
                      {typeof excelSummary?.failedCount === "number" ? (
                        <>
                          {" "}• Failed rows: <span className="font-semibold">{excelSummary.failedCount}</span>
                        </>
                      ) : null}
                    </div>
                    {excelSummary?.fileUrl ? (
                      <div className="opacity-70 mt-1 break-all">
                        File stored at:{" "}
                        <a className="underline" href={excelSummary.fileUrl} target="_blank" rel="noreferrer">
                          {excelSummary.fileUrl}
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {excelSummary?.failedRows?.length ? (
                    <details
                      className="text-xs rounded-xl px-4 py-3 bg-red-50 text-red-800 border border-red-200"
                      open
                    >
                      <summary className="font-bold cursor-pointer">Row errors (click to collapse)</summary>
                      <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                        {excelSummary.failedRows.map((r, idx) => (
                          <div
                            key={`${r?.row ?? "row"}-${idx}`}
                            className="rounded-lg bg-white/60 p-2 border border-red-100"
                          >
                            <div className="font-semibold">Row {r?.row ?? "—"}</div>
                            <ul className="list-disc pl-5 opacity-90">
                              {(Array.isArray(r?.errors) ? r.errors : [r?.errors])
                                .filter(Boolean)
                                .map((e, i) => (
                                  <li key={i}>{String(e)}</li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 opacity-80">Fix the rows in Excel and re-upload.</div>
                    </details>
                  ) : (
                    <div className="text-xs rounded-xl px-4 py-3 bg-green-50 text-green-800 border border-green-200">
                      <div className="font-bold">All rows uploaded successfully.</div>
                      <div className="opacity-80">This window will auto-close.</div>
                    </div>
                  )}

                  <details className="text-xs rounded-xl px-4 py-3 bg-gray-50 border" style={{ whiteSpace: "pre-wrap" }}>
                    <summary className="font-semibold cursor-pointer">Show raw response</summary>
                    <div className="mt-2 overflow-auto max-h-40">{JSON.stringify(result, null, 2)}</div>
                  </details>
                </div>
              ) : result ? (
                <pre className="text-xs bg-gray-50 border rounded-xl p-3 overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : null}
            </form>

            <AnimatePresence>
              {rulesOpen ? (
                <Motion.div
                  className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-[rgb(var(--primary-text-rgb)/0.55)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Motion.div
                    className="bg-(--primary-bg) w-full max-w-lg rounded-3xl sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden border border-[rgb(var(--primary-accent-rgb)/0.1)] max-h-[92vh] flex flex-col"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="bg-(--primary-accent) p-4 sm:p-5 flex justify-between items-center text-(--primary-bg)">
                      <div>
                        <h3 className="text-lg font-bold">Excel Rules (Bulk Upload)</h3>
                        <p className="text-(--secondary-accent) text-xs opacity-90">
                          Use these rules to avoid upload errors.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRulesOpen(false)}
                        className="p-2 hover:bg-red-500 rounded-full transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 space-y-3 text-sm text-(--primary-text) overflow-y-auto">
                      {rulesLoading ? (
                        <div className="text-sm">Loading rules…</div>
                      ) : rulesError ? (
                        <div className="text-sm font-semibold rounded-xl px-4 py-3 bg-red-50 text-red-700">
                          {rulesError}
                        </div>
                      ) : rules ? (
                        <>
                          <div className="text-xs rounded-xl px-4 py-3 bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)]">
                            <div className="font-bold">Required columns</div>
                            <div className="opacity-80">name, rollNumber</div>
                            <div className="mt-2 font-bold">DOB formats</div>
                            <div className="opacity-80">
                              {Array.isArray(rules?.columns)
                                ? rules.columns.find((c) => c.key === "dob")?.acceptedFormats?.join(", ") || "—"
                                : "—"}
                            </div>
                            <div className="mt-2 font-bold">Gender</div>
                            <div className="opacity-80">Male/Female are stored as M/F (OTHER supported)</div>
                          </div>

                          <div className="space-y-2">
                            {(rules.columns || []).map((c) => (
                              <div
                                key={c.key}
                                className="rounded-xl px-4 py-3 bg-white/5 border border-[rgb(var(--primary-accent-rgb)/0.1)]"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-bold">{c.label}</div>
                                  <div className="text-xs opacity-70">{c.required ? "Required" : "Optional"}</div>
                                </div>
                                {c.acceptedHeaders?.length ? (
                                  <div className="text-xs opacity-80 mt-1">
                                    Accepted headers: {c.acceptedHeaders.join(", ")}
                                  </div>
                                ) : null}
                                {c.example != null && c.example !== "" ? (
                                  <div className="text-xs opacity-80 mt-1">Example: {String(c.example)}</div>
                                ) : null}
                                {c.note ? <div className="text-xs opacity-70 mt-1">{c.note}</div> : null}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm">No rules found.</div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={downloadTemplate}
                          className="flex-1 bg-(--primary-accent) text-(--primary-bg) p-2.5 rounded-xl font-bold hover:bg-(--primary-text) transition-all"
                        >
                          Download template
                        </button>
                        <button
                          type="button"
                          onClick={() => setRulesOpen(false)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.1)] text-(--primary-accent) font-semibold hover:bg-red-500 hover:text-white transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </Motion.div>
                </Motion.div>
              ) : null}
            </AnimatePresence>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default BulkStudentUploadForm;
