// src/api/student.api.js

import { apiFetch, getBaseUrl, getStoredToken } from "./http";
import defaultStudentPhoto from "../assets/no-result-document-file-data-600nw-2293706569.webp";

const DEFAULT_AVATAR = defaultStudentPhoto;

function formatDateOnly(value) {
  if (!value) return "—";

  // Common case: ISO string -> "YYYY-MM-DDTHH:mm:ss..."
  const asString = String(value);
  if (asString.includes("T")) {
    const datePart = asString.split("T")[0];
    return datePart || "—";
  }

  // Already looks like YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) return asString;

  // Fallback: try parsing, then format in a human-readable way.
  const d = new Date(asString);
  if (Number.isNaN(d.getTime())) return asString;

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const toUiStudent = (s) => ({
  id: s?._id || s?.id,
  rollNo: s?.rollNumber ?? s?.rollNo,
  name: s?.name || "—",
  gender: s?.gender || "—",
  dob: formatDateOnly(s?.dob),
  photo: s?.profileImageUrl || s?.photo || DEFAULT_AVATAR,
  classId: s?.classId,
});

// ------------ Classroom list for teacher/admin grids ------------
export const fetchClassroomStudents = async (classId) => {
  const data = await apiFetch(`/students?classId=${encodeURIComponent(classId)}`, { method: "GET", auth: true });
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return list.map(toUiStudent);
};

export const fetchClassroomStudentsCount = async (classId) => {
  const data = await apiFetch(`/students?classId=${encodeURIComponent(classId)}`, { method: "GET", auth: true });
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return list.length;
};

// ------------ Student CRUD (admin/teacher) ------------
export const createStudent = async ({ classId, name, rollNumber, dob, gender, profileImageUrl }) => {
  const created = await apiFetch("/students", {
    method: "POST",
    auth: true,
    body: { classId, name, rollNumber, dob, gender, profileImageUrl },
  });
  return toUiStudent(created);
};

export const updateStudent = async (studentId, payload) => {
  const updated = await apiFetch(`/students/${studentId}`, {
    method: "PUT",
    auth: true,
    body: payload,
  });
  return toUiStudent(updated);
};

export const deleteStudent = async (studentId) => {
  return apiFetch(`/students/${studentId}`, { method: "DELETE", auth: true });
};

// ------------ Bulk upload (excel + zip) ------------
export const bulkUploadStudentsExcel = async ({ classId, file }) => {
  const form = new FormData();
  form.append("classId", classId);
  form.append("excelFile", file);
  return apiFetch("/students/bulk-upload", { method: "POST", auth: true, body: form });
};

export const fetchBulkStudentUploadRules = async () => {
  return apiFetch("/students/bulk-upload/rules", { method: "GET", auth: true });
};

export const downloadBulkStudentUploadTemplate = async () => {
  const url = `${getBaseUrl()}/students/bulk-upload/template`;
  const token = getStoredToken();
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Template download failed (${res.status})`);
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = "bulk-students-template.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
  return true;
};

export const bulkUploadStudentPhotosZip = async ({ classId, file }) => {
  const form = new FormData();
  form.append("classId", classId);
  form.append("file", file);
  return apiFetch("/students/bulk-photo-upload", { method: "POST", auth: true, body: form });
};

export const fetchStudentDetail = async (studentId) => {
  const data = await apiFetch(`/students/${encodeURIComponent(studentId)}`, { method: "GET", auth: true });
  return toUiStudent(data);
};

export const fetchStudentStreak = async (studentId) => {
  const data = await apiFetch(`/students/${encodeURIComponent(studentId)}/attendance-history`, { method: "GET", auth: true });
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return list
    .map((x) => ({ date: x?.date, status: x?.status }))
    .filter((x) => x.date && (x.status === "P" || x.status === "A"));
};

// Browser-only helper: build a ZIP in-memory for the server's /bulk-photo-upload endpoint.
// (Server expects a ZIP, even for one photo.)
async function buildSinglePhotoZip({ rollNumber, file }) {
  const mod = await import("jszip");
  const JSZip = mod.default || mod;

  const zip = new JSZip();
  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "jpg";
  zip.file(`${rollNumber}.${ext}`, file);

  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], `student-${rollNumber}.zip`, { type: "application/zip" });
}

export const uploadSingleStudentPhoto = async ({ classId, rollNumber, file }) => {
  const zipFile = await buildSinglePhotoZip({ rollNumber, file });
  return bulkUploadStudentPhotosZip({ classId, file: zipFile });
};
