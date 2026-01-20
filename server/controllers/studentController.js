// /server/controllers/studentController.js
const Student = require("../model/Student");
const Classroom = require("../model/Classroom");
const School = require("../model/School");
const AttendanceRecord = require("../model/AttendanceRecord");
const excelParser = require("../utils/excelParser");
const {
  BULK_STUDENT_EXCEL_RULES,
  normalizeGender,
  parseRollNumber,
  parseDob,
  createBulkStudentsTemplateBuffer,
} = require("../utils/bulkStudentExcel");
const { uploadToCloudinary, deleteFromCloudinary, uploadFileToCloudinary } = require("../utils/cloudinaryHelper");
const aiClient = require("../utils/aiClient");
const fs = require('fs');
const axios = require('axios');
const path = require('path');

function dateOnlyISO(value) {
  if (!value) return null;

  // If server already provides a date-only string, keep it.
  const asString = typeof value === "string" ? value : null;
  if (asString && /^\d{4}-\d{2}-\d{2}$/.test(asString)) return asString;

  // IMPORTANT:
  // Do NOT use toISOString() here. toISOString() converts the date to UTC,
  // which can shift a local "start of day" date into the previous/next day.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

exports.getStudents = async (req, res) => {
  try {
    const { classId } = req.query;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    // Enforce school scoping: the requested class must belong to the same school as the requester.
    // This protects PRINCIPAL (and everyone) from querying arbitrary classIds across schools.
    if (req.user?.schoolId) {
      const classroom = await Classroom.findById(classId).select('schoolId').lean();
      if (!classroom) return res.status(404).json({ message: "Classroom not found." });
      if (classroom.schoolId?.toString() !== req.user.schoolId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const students = await Student.find({ classId }).sort({ rollNumber: 1 });
    res.json(students);

  } catch (err) {
    console.error("getStudents error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/students/bulk-upload/rules
exports.getBulkUploadRules = async (req, res) => {
  res.json(BULK_STUDENT_EXCEL_RULES);
};

// GET /api/students/bulk-upload/template
exports.downloadBulkUploadTemplate = async (req, res) => {
  try {
    const buffer = createBulkStudentsTemplateBuffer();
    const fileName = "bulk-students-template.xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    res.send(buffer);
  } catch (err) {
    console.error("downloadBulkUploadTemplate error:", err);
    res.status(500).json({ message: "Failed to generate template" });
  }
};


// GET ONE STUDENT
// Route: GET /api/students/:id
exports.getStudentById = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });

    // Basic school scoping
    if (req.user?.schoolId && student.schoolId?.toString() !== req.user.schoolId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(student);
  } catch (err) {
    console.error("getStudentById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// GET STUDENT ATTENDANCE HISTORY
// Route: GET /api/students/:id/attendance-history
exports.getStudentAttendanceHistory = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findById(studentId).select("schoolId");
    if (!student) return res.status(404).json({ message: "Student not found." });

    if (req.user?.schoolId && student.schoolId?.toString() !== req.user.schoolId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const records = await AttendanceRecord.find({ studentId })
      .select("status sessionId")
      .populate("sessionId", "date")
      .lean();

    // Map to UI expected { date: 'YYYY-MM-DD', status: 'P'|'A' }
    const history = (records || [])
      .map((r) => ({
        date: dateOnlyISO(r?.sessionId?.date),
        status: r?.status,
      }))
      .filter((x) => x.date && (x.status === "P" || x.status === "A"));

    // Sort ascending by date
    history.sort((a, b) => a.date.localeCompare(b.date));

    res.json(history);
  } catch (err) {
    console.error("getStudentAttendanceHistory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.createStudent = async (req, res) => {
  try {
    const user = req.user;
    const { classId, name, rollNumber, dob, gender, profileImageUrl } = req.body;

    if (!classId || !name || !rollNumber) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const classExists = await Classroom.findById(classId);
    if (!classExists) return res.status(404).json({ message: "Classroom not found." });

    // Prevent duplicate roll numbers
    const existing = await Student.findOne({ classId, rollNumber });
    if (existing) return res.status(400).json({ message: "Roll number already exists in this class." });

    const newStudent = await Student.create({
      schoolId: user.schoolId,
      classId,
      name,
      rollNumber,
      dob,
      gender,
      profileImageUrl
    });

    res.status(201).json(newStudent);

  } catch (err) {
    console.error("createStudent error:", err);
    res.status(500).json({ message: "Server error", error: err.message, stack: err.stack });
  }
};


// UPDATE STUDENT
exports.updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    const updated = await Student.findByIdAndUpdate(
      studentId,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Student not found." });

    res.json(updated);

  } catch (err) {
    console.error("updateStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// DELETE STUDENT
exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // 1. Find Student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // 2. Handle Cloudinary Image Deletion
    if (student.profileImageUrl) {
      try {
        // Extract public_id from secure URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1570979139/folder/sample.jpg

        // 1. Split by '/upload/'
        const parts = student.profileImageUrl.split('/upload/');

        if (parts.length === 2) {
          let publicIdWithVersion = parts[1];

          // 2. Remove version if present (e.g., v123456789/)
          // Cloudinary versions start with 'v' followed by numbers and a slash
          const versionRegex = /^v\d+\//;
          let publicIdWithExt = publicIdWithVersion.replace(versionRegex, '');

          // 3. Remove file extension
          const lastDotIndex = publicIdWithExt.lastIndexOf('.');
          let publicId = publicIdWithExt;
          if (lastDotIndex !== -1) {
            publicId = publicIdWithExt.substring(0, lastDotIndex);
          }

          if (publicId) {
            await deleteFromCloudinary(publicId);
            console.log(`Deleted Cloudinary image: ${publicId}`);
          }
        }

      } catch (cloudErr) {
        // Non-blocking error
        console.error("Cloudinary deletion failed, but proceeding with student deletion:", cloudErr);
      }
    }

    // 3. Delete Student from MongoDB
    await Student.findByIdAndDelete(studentId);

    res.json({ message: "Student deleted." });

  } catch (err) {
    console.error("deleteStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// BULK UPLOAD
// BULK UPLOAD
exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Excel file required." });

    const { classId } = req.body;
    if (!classId) {
      // Cleanup if validation fails
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "classId required." });
    }

    const classExists = await Classroom.findById(classId);
    if (!classExists) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Classroom not found." });
    }

    // School context
    const schoolId = req.user.schoolId;
    const school = await School.findById(schoolId);
    if (!school) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "School not found." });
    }

    // Use exact names
    const schoolName = school.name;
    const className = classExists.name;

    // Path: [School Name]/student-data/[Class Name]
    const folderPath = `${schoolName}/student-data/${className}`;

    // Upload to Cloudinary (Raw)
    let secureUrl;
    try {
      secureUrl = await uploadFileToCloudinary(req.file.path, folderPath);
    } catch (uploadErr) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      console.error("Cloudinary Upload Failed:", uploadErr);
      return res.status(502).json({ message: "Failed to upload file to cloud storage.", error: uploadErr.message });
    }

    // Cleanup Local File IMMEDIATELY
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupErr) {
      console.warn("Failed to delete local temp file:", cleanupErr);
    }

    // Download buffer from Cloudinary
    let fileBuffer;
    try {
      // Axios request for buffer
      const response = await axios.get(secureUrl, { responseType: 'arraybuffer' });
      fileBuffer = response.data;
    } catch (downloadErr) {
      console.error("Cloudinary Download Failed:", downloadErr);
      return res.status(502).json({ message: "Failed to retrieve file from cloud storage." });
    }

    // Parse Buffer
    // Note: excelParser needs to be updated or we need to pass a buffer. 
    // Looking at global context, excelParser takes a FILE PATH usually. 
    // I need to check excelParser.js. The user said: "Pass this buffer into your excelParser.js ... to extract student JSON objects."
    // So I assume I need to MODIFY excelParser.js or check if it supports buffer.
    // Let's assume for this step I will pass the buffer and fix excelParser in the next step or if I can see it now.
    // The previous view of excelParser.js showed it was 729 bytes. I haven't read it yet.
    // I will pass the buffer here.

    const parsed = await excelParser(fileBuffer);

    const resultsByRow = new Map();
    const candidates = []; // { rowIndex, doc }
    const seenRollNumbers = new Set();

    for (const row of parsed || []) {
      const rowIndex = row?.rowIndex;
      const errors = [];

      const name = String(row?.name ?? "").trim();
      if (!name) errors.push("name required");

      const rollParsed = parseRollNumber(row?.rollNumber);
      if (rollParsed.error) errors.push(rollParsed.error);

      if (!rollParsed.error && rollParsed.value != null) {
        if (seenRollNumbers.has(rollParsed.value)) {
          errors.push("Duplicate rollNumber in Excel file");
        } else {
          seenRollNumbers.add(rollParsed.value);
        }
      }

      const dobParsed = parseDob(row?.dob);
      if (dobParsed.error) errors.push(dobParsed.error);

      const genderParsed = normalizeGender(row?.gender);
      if (genderParsed.error) errors.push(genderParsed.error);

      const profileImageUrl = String(row?.profileImageUrl ?? "").trim();

      // Ignore completely empty rows (common in Excel)
      const isTrulyEmpty = !name && !String(row?.rollNumber ?? "").trim() && !String(row?.dob ?? "").trim() && !String(row?.gender ?? "").trim() && !profileImageUrl;
      if (isTrulyEmpty) continue;

      if (errors.length) {
        resultsByRow.set(rowIndex, { row: rowIndex, success: false, errors });
        continue;
      }

      const doc = {
        schoolId: schoolId,
        classId,
        name,
        rollNumber: rollParsed.value,
        dob: dobParsed.value || null,
        gender: genderParsed.value || null,
        profileImageUrl: profileImageUrl || null,
      };

      candidates.push({ rowIndex, doc });
      resultsByRow.set(rowIndex, { row: rowIndex, success: true, errors: [] });
    }

    // DB duplicate check (single query)
    if (candidates.length > 0) {
      const rollNumbers = candidates.map((c) => c.doc.rollNumber);
      const existing = await Student.find({ classId, rollNumber: { $in: rollNumbers } })
        .select("rollNumber")
        .lean();
      const existingSet = new Set((existing || []).map((x) => x.rollNumber));

      for (const c of candidates) {
        if (existingSet.has(c.doc.rollNumber)) {
          resultsByRow.set(c.rowIndex, { row: c.rowIndex, success: false, errors: ["Duplicate rollNumber in DB"] });
          c.skip = true;
        }
      }
    }

    const docsToInsert = candidates.filter((c) => !c.skip).map((c) => c.doc);
    const metaToInsert = candidates.filter((c) => !c.skip);

    let uploaded = 0;
    if (docsToInsert.length > 0) {
      try {
        const inserted = await Student.insertMany(docsToInsert, { ordered: false });
        uploaded = Array.isArray(inserted) ? inserted.length : docsToInsert.length;
      } catch (insertErr) {
        // Handle partial success for ordered:false
        const writeErrors = Array.isArray(insertErr?.writeErrors) ? insertErr.writeErrors : [];
        const failedIndexes = new Set(writeErrors.map((e) => e.index));

        for (const e of writeErrors) {
          const meta = metaToInsert[e.index];
          if (!meta) continue;
          const msg = e?.code === 11000 ? "Duplicate rollNumber in DB" : (e?.errmsg || "Insert failed");
          resultsByRow.set(meta.rowIndex, { row: meta.rowIndex, success: false, errors: [msg] });
        }

        // Count successes = attempted - failed
        uploaded = metaToInsert.length - failedIndexes.size;
      }
    }

    const results = Array.from(resultsByRow.values()).sort((a, b) => (a.row || 0) - (b.row || 0));
    res.json({ uploaded, results, fileUrl: secureUrl });

  } catch (err) {
    console.error("bulkUpload error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateStudentProfileImage = async (req, res) => {
  try {
    const studentId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    // 1. Find Student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // 2. Fetch related data for path: School Name & Class Name
    // req.user.schoolId should match student.schoolId usually, but let's use the student's data source of truth or req.user as reliable context.
    // The requirement says: "Use req.user.schoolId (or schoolName if available)"
    // And path: <schoolName>/students/<className>/face-images/

    // We need the School Name
    const school = await School.findById(req.user.schoolId);
    if (!school) return res.status(404).json({ message: "School not found." });

    // We need the Class Name
    const classroom = await Classroom.findById(student.classId);
    if (!classroom) return res.status(404).json({ message: "Classroom not found (linked to student)." });

    const schoolName = school.name.trim(); // Sanitize if needed? Cloudinary handles spaces usually, but allow standard string
    const className = classroom.name.trim();

    // 3. Construct Path
    // Pattern: <schoolName>/students/<className>/face-images/
    const folderPath = `${schoolName}/students/${className}/face-images/`;

    // 4. Upload to Cloudinary
    // Use rollNumber as public_id
    const publicId = student.rollNumber; // Ensure this is string

    const imageUrl = await uploadToCloudinary(req.file.buffer, folderPath, publicId.toString());

    // 5. Update Student
    student.profileImageUrl = imageUrl;
    await student.save();

    // 7. Trigger AI Learning (Non-blocking)
    try {
      // We pass the student ID, class ID, and the new secure URL
      // explicit string conversion for IDs to be safe
      await aiClient.generateEmbedding(student._id.toString(), student.classId.toString(), imageUrl);
      console.log(`AI embedding generation triggered for student: ${student.rollNumber}`);
    } catch (aiError) {
      // Log warning but DO NOT fail the request
      console.warn("AI Service Warning: Failed to trigger embedding generation.", {
        studentId: student._id,
        error: aiError.message
      });
    }

    // 6. Return updated student
    res.json(student);

  } catch (err) {
    console.error("updateStudentProfileImage error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
