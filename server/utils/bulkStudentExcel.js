const xlsx = require("xlsx");

const BULK_STUDENT_EXCEL_RULES = {
  version: 1,
  title: "Bulk Student Upload Excel Rules",
  sheet: {
    index: 0,
    name: "Students",
    note: "Only the first sheet is read. You can name it anything, but the template uses 'Students'.",
  },
  columns: [
    {
      key: "name",
      label: "name",
      required: true,
      acceptedHeaders: ["name", "student name", "studentname", "full name", "fullname"],
      type: "string",
      rules: ["Cannot be empty"],
      example: "Aarav Sharma",
    },
    {
      key: "rollNumber",
      label: "rollNumber",
      required: true,
      acceptedHeaders: ["rollNumber", "roll number", "roll_no", "rollno", "roll"],
      type: "number",
      rules: ["Must be a positive integer", "Must be unique within the Excel file", "Must be unique within the class"],
      example: 101,
    },
    {
      key: "dob",
      label: "dob",
      required: false,
      acceptedHeaders: ["dob", "date of birth", "dateofbirth"],
      type: "date",
      rules: ["If provided, must be a valid date"],
      acceptedFormats: ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"],
      example: "2008-07-19",
      note: "You can also choose a date using Excel date picker. If the cell is a real date, it will be accepted.",
    },
    {
      key: "gender",
      label: "gender",
      required: false,
      acceptedHeaders: ["gender", "sex"],
      type: "string",
      rules: ["If provided, it will be normalized and stored as M, F, or OTHER"],
      acceptedValues: ["M", "F", "OTHER", "Male", "Female"],
      example: "Male",
      storedAs: "M",
    },
    {
      key: "profileImageUrl",
      label: "profileImageUrl",
      required: false,
      acceptedHeaders: ["profileImageUrl", "profile image url", "imageUrl", "image url"],
      type: "string",
      rules: ["Optional"],
      example: "https://example.com/student-101.jpg",
    },
  ],
  notes: [
    "Headers are case/spacing-insensitive (e.g., 'Roll Number', 'roll_no' are accepted).",
    "Empty rows are allowed but will be ignored if all fields are blank.",
    "Gender values like 'Male'/'Female' are automatically stored as 'M'/'F'.",
  ],
};

function normalizeGender(raw) {
  const value = raw == null ? "" : String(raw).trim();
  if (!value) return { value: null, error: null };

  const v = value.toLowerCase();
  if (v === "m" || v === "male" || v === "man" || v === "boy") return { value: "M", error: null };
  if (v === "f" || v === "female" || v === "woman" || v === "girl") return { value: "F", error: null };
  if (v === "other" || v === "others" || v === "o" || v === "non-binary" || v === "nonbinary") {
    return { value: "OTHER", error: null };
  }

  return {
    value: null,
    error: "Invalid gender. Allowed: Male/Female (stored as M/F) or OTHER",
  };
}

function parseRollNumber(raw) {
  if (raw == null) return { value: null, error: "rollNumber required" };
  if (typeof raw === "string" && !raw.trim()) return { value: null, error: "rollNumber required" };

  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return { value: null, error: "rollNumber must be a number" };
  if (!Number.isInteger(n)) return { value: null, error: "rollNumber must be an integer" };
  if (n <= 0) return { value: null, error: "rollNumber must be a positive integer" };
  return { value: n, error: null };
}

function parseDob(raw) {
  if (raw == null) return { value: null, error: null };
  if (typeof raw === "string" && !raw.trim()) return { value: null, error: null };

  // If xlsx gives us a Date (with cellDates: true)
  if (raw instanceof Date) {
    const t = raw.getTime();
    if (Number.isNaN(t)) return { value: null, error: "Invalid dob" };
    return { value: new Date(raw.getFullYear(), raw.getMonth(), raw.getDate()), error: null };
  }

  // If xlsx gives us an Excel serial date number
  if (typeof raw === "number" && Number.isFinite(raw)) {
    try {
      const parsed = xlsx.SSF && typeof xlsx.SSF.parse_date_code === "function" ? xlsx.SSF.parse_date_code(raw) : null;
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return { value: new Date(parsed.y, parsed.m - 1, parsed.d), error: null };
      }
    } catch {
      // fallthrough
    }

    return {
      value: null,
      error: "Invalid dob. Please use a real Excel date cell or one of: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY",
    };
  }

  const s = String(raw).trim();

  // YYYY-MM-DD
  let m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return { value: dt, error: null };
    return { value: null, error: "Invalid dob (date out of range)" };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  m = /^([0-9]{2})[\/-]([0-9]{2})[\/-]([0-9]{4})$/.exec(s);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return { value: dt, error: null };
    return { value: null, error: "Invalid dob (date out of range)" };
  }

  return {
    value: null,
    error: "Invalid dob. Allowed formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (or pick a date in Excel)",
  };
}

function createBulkStudentsTemplateBuffer() {
  const headers = ["name", "rollNumber", "dob", "gender", "profileImageUrl"];
  const exampleRow = ["Aarav Sharma", 101, "2008-07-19", "Male", ""];
  const data = [headers, exampleRow];

  const ws = xlsx.utils.aoa_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, BULK_STUDENT_EXCEL_RULES.sheet.name);

  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  BULK_STUDENT_EXCEL_RULES,
  normalizeGender,
  parseRollNumber,
  parseDob,
  createBulkStudentsTemplateBuffer,
};
