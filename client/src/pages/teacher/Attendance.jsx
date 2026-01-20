// src/pages/teacher/Attendance.jsx

import { motion as Motion, AnimatePresence, m } from "framer-motion";
import { Download, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import ImageUpload from "../../components/attendance/ImageUpload";
import AttendanceLegend from "../../components/attendance/AttendanceLegend";
import AttendanceTable from "../../components/attendance/AttendanceTable";
import Loader from "../../components/common/Loader";
import { useAttendanceStore } from "../../app/store";
import { uploadClassroomImages, submitAttendance } from "../../api/attendance.api";
import { listMyClassesApi } from "../../api/classes.api";
import { useEffect, useMemo, useState } from "react";
import { getBaseUrl } from "../../api/http";
import { useAuth } from "../../context/authContext";

const SUBMITTED_OVERLAY_MS = 1750;

const getLocalYyyyMmDd = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const submittedReportKey = (userId, classId) => `attendance:submittedReport:${userId || "anon"}:${classId}`;

const AnimatedSuccessIcon = () => (
  <Motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 260, damping: 18 }}
    className="w-20 h-20 bg-(--secondary-bg) rounded-full flex items-center justify-center mx-auto border border-[rgb(var(--primary-accent-rgb)/0.1)]"
  >
    <svg
      viewBox="0 0 64 64"
      width="44"
      height="44"
      fill="none"
      aria-hidden="true"
    >
      <Motion.circle
        cx="32"
        cy="32"
        r="24"
        stroke="var(--primary-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <Motion.path
        d="M22 33.5l7 7L43 26.5"
        stroke="var(--primary-accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.35, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  </Motion.div>
);

const Attendance = () => {
  const { user } = useAuth();

  // Access global state
  const {
    stage, images, attendanceData,
    setStage, setImages, setAttendanceData,
    sessionId,
    setSessionId,
    toggleStudentStatus, resetFlow,
    syncInitialStatuses
  } = useAttendanceStore();

  const [activeClass, setActiveClass] = useState(null);
  const [classesLoading, setClassesLoading] = useState(true);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [showSubmittedOverlay, setShowSubmittedOverlay] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [processError, setProcessError] = useState(null);

  const getHealthUrl = () => {
    try {
      const apiBase = getBaseUrl();
      const healthBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
      return `${String(healthBase).replace(/\/+$/, '')}/health`;
    } catch {
      return null;
    }
  };

  const handleResetFlow = () => {
    try {
      if (typeof window !== "undefined" && activeClass?.id) {
        localStorage.removeItem(submittedReportKey(user?.id, activeClass.id));
      }
    } catch {
      // ignore storage failures
    }
    resetFlow();
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefersReducedMotion(Boolean(mq.matches));
    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (stage !== "submitted") {
      setShowSubmittedOverlay(false);
      return;
    }

    if (prefersReducedMotion) {
      setShowSubmittedOverlay(false);
      return;
    }

    setShowSubmittedOverlay(true);
    const timer = window.setTimeout(() => {
      setShowSubmittedOverlay(false);
    }, SUBMITTED_OVERLAY_MS);

    return () => window.clearTimeout(timer);
  }, [stage, prefersReducedMotion]);

  useEffect(() => {
    let alive = true;

    const loadClasses = async () => {
      try {
        setClassesLoading(true);
        const classes = await listMyClassesApi();
        if (!alive) return;
        setActiveClass(classes?.[0] || null);
      } catch (error) {
        console.error("Failed to load classes", error);
        if (alive) setActiveClass(null);
      } finally {
        if (alive) setClassesLoading(false);
      }
    };

    loadClasses();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (classesLoading) return;
    if (!activeClass?.id) return;

    try {
      const key = submittedReportKey(user?.id, activeClass.id);
      const stored = localStorage.getItem(key);
      if (stored === getLocalYyyyMmDd()) {
        // Ensure the UI is consistent even if the store is fresh after login.
        setImages([]);
        setAttendanceData([]);
        setSessionId(null);
        setStage("submitted");
      } else if (stored) {
        // Day-wise: if it's not for today, discard.
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage failures
    }
  }, [activeClass?.id, classesLoading, setAttendanceData, setImages, setSessionId, setStage, user?.id]);

  const summary = useMemo(() => {
    const present = (attendanceData || []).filter((s) => s.status === "P");
    const absent = (attendanceData || []).filter((s) => s.status === "A");
    return {
      total: (attendanceData || []).length,
      present,
      absent,
    };
  }, [attendanceData]);

  const handleProcessImages = async () => {
    if (images.length === 0) return;
    if (classesLoading) return;
    if (!activeClass?.id) {
      console.error("No class available for attendance.");
      return;
    }

    setProcessError(null);
    setStage("processing");

    try {
      const response = await uploadClassroomImages({
        classId: activeClass.id,
        files: images,
        sessionId,
      });

      setSessionId(response.sessionId || null);
      setAttendanceData(response.records || []);
      setStage("preview");
    } catch (error) {
      console.error("Failed to process images", error);
      const msg =
        error?.message ||
        (typeof error === 'string' ? error : null) ||
        'Failed to process images. Please try again.';

      // Helpful hint for mobile/network/CORS issues where fetch throws TypeError.
      const isFetchFailure =
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('network');

      if (isFetchFailure) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        let apiBase = '';
        try {
          apiBase = getBaseUrl();
        } catch {
          apiBase = '';
        }

        // Try a no-cors probe to see if the backend is reachable at all.
        // If this succeeds but the real request fails, it strongly suggests a CORS/preflight block.
        const healthUrl = getHealthUrl();
        if (healthUrl) {
          try {
            await fetch(healthUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
            setProcessError(
              `Failed to fetch — Backend is reachable but the browser blocked the API call (likely CORS). Origin: ${origin}${apiBase ? ` | API: ${apiBase}` : ''}`
            );
          } catch {
            setProcessError(
              `Failed to fetch — Cannot reach backend (${healthUrl}). Check DNS/SSL/network.${apiBase ? ` API: ${apiBase}` : ''}`
            );
          }
        } else {
          setProcessError(
            `Failed to fetch — Network error contacting the server. Origin: ${origin}${apiBase ? ` | API: ${apiBase}` : ''}`
          );
        }
      } else {
        setProcessError(msg);
      }
      setStage("upload"); // Revert on error
    }
  };

  const handleSubmit = async () => {
    try {
      if (!sessionId) {
        console.error("Missing sessionId; cannot submit attendance edits.");
        return;
      }

      const updates = (attendanceData || [])
        .filter((r) => r?.id && r?.status && r?.initialStatus && r.status !== r.initialStatus)
        .map((r) => ({ recordId: r.id, status: r.status }));

      if (updates.length > 0) {
        await submitAttendance(sessionId, updates);
        syncInitialStatuses();
      }
      setStage("submitted");

      // Persist reaching the final stage for the current day so the teacher
      // sees the same stage after re-login/reload (day-wise, per class).
      try {
        if (activeClass?.id) {
          localStorage.setItem(submittedReportKey(user?.id, activeClass.id), getLocalYyyyMmDd());
        }
      } catch {
        // ignore storage failures
      }
    } catch (error) {
      console.error("Submission failed", error);
    }
  };

  const handleDownloadReport = async () => {
    if (!activeClass?.id) return;

    const baseUrl = getBaseUrl();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const date = `${year}-${month}`;
    const url = `${baseUrl}/reports/class/${activeClass.id}/month/${date}`;

    setReportDownloading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Report download failed (${res.status})`);

      const blob = await res.blob();

      // Force a consistent, user-friendly filename
      const fileName = `Attendance_Report (${day}-${month}-${year}).xlsx`;

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      // Persist: if report is generated for today, keep showing "submitted" stage for the day.
      try {
        localStorage.setItem(submittedReportKey(user?.id, activeClass.id), getLocalYyyyMmDd());
      } catch {
        // ignore storage failures
      }
    } catch (error) {
      console.error("Failed to download report", error);
    } finally {
      setReportDownloading(false);
    }
  };

  // Helper for progress stepper UI
  const StepIndicator = ({ currentStage }) => {
    const steps = ["Upload", "Verify", "Done"];
    const activeIdx = currentStage === "upload" ? 0 : currentStage === "submitted" ? 2 : 1;

    return (
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= activeIdx ? 'bg-(--primary-accent) text-(--primary-bg)' : 'bg-(--primary-bg) text-[rgb(var(--primary-accent-rgb)/0.4)] border border-[rgb(var(--primary-accent-rgb)/0.1)]'}`}>
              {i + 1}
            </div>
            <span className={`text-sm font-semibold ${i <= activeIdx ? 'text-(--primary-text)' : 'text-[rgb(var(--primary-accent-rgb)/0.4)]'}`}>{s}</span>
            {i < 2 && <div className="w-8 h-0.5 bg-[rgb(var(--primary-accent-rgb)/0.1)] ml-2" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {stage === "submitted" && showSubmittedOverlay && (
          <Motion.div
            key="submitted-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-(--primary-bg) backdrop-blur-xl"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px))',
              paddingRight: 'calc(env(safe-area-inset-right, 0px))',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
              paddingLeft: 'calc(env(safe-area-inset-left, 0px))'
            }}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-center"
            >
              <AnimatedSuccessIcon />
              <div className="mt-4 text-sm font-semibold text-(--primary-text)">Attendance submitted</div>
              <div className="mt-1 text-xs text-[rgb(var(--primary-accent-rgb)/0.6)]">Saving your record…</div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto pb-25">
        {/* Header Section */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-(--primary-text) tracking-tight">Take Attendance</h1>
          <p className="text-[rgb(var(--primary-accent-rgb)/0.6)] mt-1 font-medium">
            Our AI will detect faces from your classroom photos.
            {activeClass?.name ? ` (Class: ${activeClass.name})` : ""}
          </p>
        </div>

        <StepIndicator currentStage={stage} />

        <AnimatePresence mode="wait">
        {/* STAGE: UPLOAD */}
        {stage === "upload" && (
          <Motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-(--primary-bg) p-6 rounded-2xl shadow-sm border border-[rgb(var(--primary-accent-rgb)/0.05)]">
              <ImageUpload images={images} setImages={setImages} />

              {processError && (
                <div className="mt-5 w-full rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-600/90">
                  {processError}
                </div>
              )}

              <div className="mt-8 flex flex-col items-center gap-4">
                <button
                  disabled={images.length === 0 || classesLoading || !activeClass?.id}
                  onClick={handleProcessImages}
                  style={{ cursor: images.length > 0 && !classesLoading && activeClass?.id ? 'pointer' : 'not-allowed' }}
                  className={`w-full md:w-auto px-10 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 
                    ${images.length === 0 || classesLoading || !activeClass?.id ? "bg-(--secondary-bg) text-[rgb(var(--primary-accent-rgb)/0.4)] border border-[rgb(var(--primary-accent-rgb)/0.1)]" : "bg-(--primary-accent) text-(--primary-bg) hover:bg-(--primary-text) shadow-lg shadow-[rgb(var(--primary-accent-rgb)/0.2)]"}`}
                >
                  <Sparkles size={18} />
                  Start AI Recognition
                </button>
                <p className="text-xs text-[rgb(var(--primary-accent-rgb)/0.5)]">Upload 1 to 4 images for best accuracy</p>
                {!classesLoading && !activeClass?.id && (
                  <p className="text-xs text-rose-500/80">No class assigned to this teacher.</p>
                )}
              </div>
            </div>
          </Motion.div>
        )}

        {/* STAGE: PROCESSING */}
        {stage === "processing" && (
          <Motion.div
            key="processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-(--primary-bg) rounded-2xl shadow-sm border border-[rgb(var(--primary-accent-rgb)/0.05)] p-16 flex flex-col items-center gap-6"
          >
            <Loader size="large" />
            <div className="text-center">
              <h3 className="text-xl font-bold text-(--primary-text)">Analyzing Classroom...</h3>
              <p className="text-[rgb(var(--primary-accent-rgb)/0.6)] mt-1 font-medium">Identifying students and matching records.</p>
            </div>
          </Motion.div>
        )}

        {/* STAGE: PREVIEW & EDIT */}
        {stage === "preview" && (
          <Motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 py-5"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <AttendanceLegend />
              <button
                onClick={handleResetFlow}
                style={{ cursor: 'pointer' }}
                className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary-accent-rgb)/0.6)] hover:text-(--primary-text) transition-colors"
              >
                <RotateCcw size={16} /> Re-upload Images
              </button>
            </div>

            <div className="bg-(--primary-bg) rounded-2xl shadow-sm border border-[rgb(var(--primary-accent-rgb)/0.05)] p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--primary-accent-rgb)/0.4)]">Summary</div>
                  <div className="text-sm text-[rgb(var(--primary-accent-rgb)/0.7)] mt-1">
                    Total: <span className="font-bold text-(--primary-text)">{summary.total}</span> &nbsp;•&nbsp; Present:{" "}
                    <span className="font-bold text-(--primary-accent)">{summary.present.length}</span> &nbsp;•&nbsp; Absent:{" "}
                    <span className="font-bold text-rose-500/80">{summary.absent.length}</span>
                  </div>
                </div>

                <div className="text-xs text-[rgb(var(--primary-accent-rgb)/0.5)]">
                  Detected (P) roll nos: {summary.present.map((s) => s.rollNo).filter(Boolean).join(", ") || "—"}
                  <br />
                  Absent (A) roll nos: {summary.absent.map((s) => s.rollNo).filter(Boolean).join(", ") || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden overflow-x-auto">
              <AttendanceTable data={attendanceData} onToggle={toggleStudentStatus} />
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-4">
              <button
                onClick={handleSubmit}
                style={{ cursor: 'pointer' }}
                className="px-8 py-3 rounded-xl bg-(--primary-accent) text-(--primary-bg) font-bold hover:bg-(--primary-text) transition-all flex items-center justify-center gap-2 shadow-lg shadow-[rgb(var(--primary-accent-rgb)/0.2)]"
              >
                <ShieldCheck size={18} />
                Confirm & Submit
              </button>
            </div>
          </Motion.div>
        )}

        {/* STAGE: SUBMITTED */}
        {stage === "submitted" && (
          <Motion.div
            key="submitted"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-(--primary-bg) rounded-2xl shadow-sm border border-[rgb(var(--primary-accent-rgb)/0.05)] p-12 text-center space-y-6 max-w-md mx-auto"
          >
            <div className="flex">
              {/* <AnimatedSuccessIcon /> */}
              <img
                src="/undraw_document-ready_o5d5.svg"
                alt="Document ready illustration"
                loading="lazy"
                className="w-30 h-30 max-w-md mx-auto"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-(--primary-text)">Submission Complete!</h2>
              <p className="text-[rgb(var(--primary-accent-rgb)/0.6)] mt-2 font-medium">
                Attendance for {activeClass?.name || "your class"} has been recorded and synced.
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={!activeClass?.id || reportDownloading}
              style={{ cursor: !activeClass?.id || reportDownloading ? 'not-allowed' : 'pointer' }}
              className={`w-full py-3 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border 
                ${!activeClass?.id || reportDownloading
                  ? 'bg-(--secondary-bg) text-[rgb(var(--primary-accent-rgb)/0.4)] border-[rgb(var(--primary-accent-rgb)/0.1)]'
                  : 'bg-(--primary-bg) text-(--primary-accent) border-[rgb(var(--primary-accent-rgb)/0.2)] hover:bg-(--secondary-bg)'
                }`}
            >
              <Download size={18} />
              {reportDownloading ? 'Downloading…' : 'Download Attendance Report'}
            </button>
          </Motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Attendance;