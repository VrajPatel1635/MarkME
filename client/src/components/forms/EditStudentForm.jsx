import { X, User, GraduationCap, Calendar, Image as ImportError } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { updateStudent, uploadSingleStudentPhoto } from "../../api/student.api";

const EditStudentForm = ({ isOpen, onClose, student, classroomId, onUpdated }) => {
  const [form, setForm] = useState({ name: "", rollNo: "", gender: "", dob: "", photo: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isMobileBrowser = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    // Prefer UA Client Hints when available
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
    const ua = navigator.userAgent || "";
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }, []);

  const rollNoNum = useMemo(() => Number(String(form.rollNo).trim()), [form.rollNo]);

  useEffect(() => {
    if (!isOpen || !student) return;
    setForm({
      name: student.name || "",
      rollNo: String(student.rollNo ?? ""),
      gender: student.gender === "Male" ? "M" : student.gender === "Female" ? "F" : student.gender || "",
      dob: (student.dob && String(student.dob).slice(0, 10)) || "",
      photo: null,
    });
    setError("");
    setSuccess("");
  }, [isOpen, student]);

  const validatePhoto = (file, rollNumber) => {
    if (!file) return null;

    const name = file.name || "";
    const parts = name.split(".");
    if (parts.length < 2) return "Photo filename must be <rollNumber>.<jpg|jpeg|png>";

    const ext = parts.pop()?.toLowerCase();
    const base = parts.join(".");

    if (!/^(jpg|jpeg|png)$/.test(ext || "")) return "Only JPG, JPEG, PNG files are allowed.";

    // Mobile gallery pickers (Android Chrome/iOS Safari) often provide a generated filename
    // (e.g., numeric IDs) that doesn't match the visible gallery rename. We rename on upload.
    if (!isMobileBrowser) {
      if (!/^\d+$/.test(base)) return "Photo filename must start with digits (roll number).";
      if (Number(base) !== Number(rollNumber)) return `Photo filename must be ${rollNumber}.${ext}`;
    }

    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!student?.id) {
      setError("Missing student");
      return;
    }

    if (!form.name?.trim()) {
      setError("Name is required");
      return;
    }

    if (!Number.isFinite(rollNoNum) || rollNoNum <= 0) {
      setError("Roll No must be a valid positive number");
      return;
    }

    const photoErr = validatePhoto(form.photo, rollNoNum);
    if (photoErr) {
      setError(photoErr);
      return;
    }

    setSubmitting(true);
    try {
      await updateStudent(student.id, {
        name: form.name.trim(),
        rollNumber: rollNoNum,
        gender: form.gender || null,
        dob: form.dob || null,
      });

      if (form.photo) {
        // Server ZIP photo endpoint needs classId + rollNumber
        await uploadSingleStudentPhoto({ classId: classroomId || student.classId, rollNumber: rollNoNum, file: form.photo });

        // Show success only for individual photo upload.
        setSuccess("Upload completed successfully.");
        await new Promise((r) => setTimeout(r, 900));
      }

      await onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <Motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:backdrop-blur-sm bg-[rgb(var(--primary-text-rgb)/0.5)] w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Motion.div
            className="bg-(--primary-bg) w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[rgb(var(--primary-accent-rgb)/0.1)]"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="bg-(--primary-accent) p-6 flex justify-between items-center text-(--primary-bg)">
              <div>
                <h3 className="text-xl font-bold">Edit Student</h3>
                <p className="text-(--secondary-accent) text-sm opacity-90">Update student details</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-red-500 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={submit}>
              {error && (
                <div className="text-sm font-semibold rounded-xl px-4 py-3 bg-red-50 text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm font-semibold rounded-xl px-4 py-3 bg-green-50 text-green-700 border border-green-200">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-(--primary-accent)">Student Name</label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--primary-accent-rgb)/0.4)]"
                  />
                  <input
                    className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2.5 pl-10 pr-4 text-(--primary-text) focus:outline-none focus:border-(--secondary-accent) focus:ring-1 focus:ring-(--secondary-accent) transition-all"
                    placeholder="Student Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-(--primary-accent)">Roll No</label>
                  <div className="relative">
                    <GraduationCap
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--primary-accent-rgb)/0.4)]"
                    />
                    <input
                      className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2.5 pl-10 pr-4 text-(--primary-text) focus:outline-none focus:border-(--secondary-accent) focus:ring-1 focus:ring-(--secondary-accent) transition-all"
                      placeholder="Roll No"
                      inputMode="numeric"
                      value={form.rollNo}
                      onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-(--primary-accent)">Gender</label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--primary-accent-rgb)/0.4)]"
                    />
                    <select
                      className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2.5 pl-10 pr-4 text-(--primary-text) focus:outline-none focus:border-(--secondary-accent) focus:ring-1 focus:ring-(--secondary-accent) transition-all"
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-(--primary-accent)">Date of Birth</label>
                <div className="relative">
                  <Calendar
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--primary-accent-rgb)/0.4)]"
                  />
                  <input
                    type="date"
                    className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2.5 pl-10 pr-4 text-(--primary-text) focus:outline-none focus:border-(--secondary-accent) focus:ring-1 focus:ring-(--secondary-accent) transition-all"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-(--primary-accent)">
                  Replace Photo <span className="text-xs font-normal opacity-70">(JPG/PNG)</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    className="w-full bg-(--secondary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl py-2 px-3 text-sm text-(--primary-text) file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-(--primary-accent) file:text-(--primary-bg) hover:file:opacity-80"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] ?? null })}
                  />
                </div>
                <p className="text-xs text-(--primary-accent) opacity-60 ml-1">
                  {isMobileBrowser ? (
                    <>
                      On mobile, the gallery may show a generated filename — that&apos;s OK. We&apos;ll store it as{" "}
                      <span className="font-bold">{Number.isFinite(rollNoNum) && rollNoNum > 0 ? `${rollNoNum}.jpg` : "<rollNo>.jpg"}</span>
                    </>
                  ) : (
                    <>
                      Filename must be{" "}
                      <span className="font-bold">{Number.isFinite(rollNoNum) && rollNoNum > 0 ? `${rollNoNum}.jpg` : "<rollNo>.jpg"}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  disabled={submitting}
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.1)] text-(--primary-accent) font-semibold hover:bg-red-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-(--primary-accent) text-(--primary-bg) font-bold shadow-[0_10px_15px_-3px_rgb(var(--primary-accent-rgb)/0.2),0_4px_6px_-4px_rgb(var(--primary-accent-rgb)/0.2)] hover:bg-(--primary-text) transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:bg-(--primary-accent)"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default EditStudentForm;
