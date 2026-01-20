// /server/utils/excelParser.js
const xlsx = require("xlsx");

module.exports = function parseExcel(input) {
  try {
    // Support Buffer, ArrayBuffer (axios arraybuffer), or file path.
    const isArrayBuffer =
      input &&
      (input instanceof ArrayBuffer ||
        (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)));

    const asBuffer = Buffer.isBuffer(input)
      ? input
      : isArrayBuffer
      ? Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input)
      : null;

    let workbook;
    if (asBuffer) {
      workbook = xlsx.read(asBuffer, { type: "buffer", cellDates: true });
    } else {
      workbook = xlsx.readFile(input, { cellDates: true });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const normalizeHeader = (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    const buildNormalizedHeaderMap = (row) => {
      const normalized = {};
      if (!row || typeof row !== "object") return normalized;

      for (const [key, val] of Object.entries(row)) {
        const normalizedKey = normalizeHeader(key);
        if (!normalizedKey) continue;
        if (!(normalizedKey in normalized)) normalized[normalizedKey] = val;
      }

      return normalized;
    };

    const pickFirst = (normalizedRow, aliases) => {
      for (const alias of aliases) {
        const key = normalizeHeader(alias);
        if (key && key in normalizedRow) return normalizedRow[key];
      }
      return "";
    };

    let parsed = [];
    let rowIndex = 2; // row 1 = headers

    for (let row of rows) {
      const normalizedRow = buildNormalizedHeaderMap(row);

      parsed.push({
        rowIndex,
        name: pickFirst(normalizedRow, ["name", "studentname", "student name", "fullname", "full name"]) || "",
        rollNumber: pickFirst(normalizedRow, ["rollnumber", "roll number", "roll_no", "rollno", "roll"]) || "",
        dob: pickFirst(normalizedRow, ["dob", "dateofbirth", "date of birth"]) || "",
        gender: pickFirst(normalizedRow, ["gender", "sex"]) || "",
        profileImageUrl: pickFirst(normalizedRow, ["profileimageurl", "profile image url", "imageurl", "image url"]) || "" // Optional
      });

      rowIndex++;
    }

    return parsed;

  } catch (err) {
    console.error("Excel parser error:", err);
    throw err;
  }
};
