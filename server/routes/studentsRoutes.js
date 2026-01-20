// /server/routes/students.routes.js
const express = require("express");
const router = express.Router();

const studentController = require("../controllers/studentController");
const bulkPhotoController = require("../controllers/bulkPhotoController");
const auth = require("../middlewares/authMiddleware");
const { requireRole, requireAnyRole } = require("../middlewares/roleMiddleware");
const { uploadExcel, uploadZip } = require("../middlewares/uploadMiddleware");

/*
    ================================
    @route   GET /api/students
    @desc    Get list of students by classId
    @access  Authenticated (Teacher/Admin)
    ================================
*/
router.get("/", auth, studentController.getStudents);

/*
    ================================================
    @route   GET /api/students/bulk-upload/rules
    @desc    Get Excel rules for bulk student upload
    @access  Teacher/Admin/Principal
    ================================================
*/
router.get(
    "/bulk-upload/rules",
    auth,
    requireAnyRole(["ADMIN", "TEACHER", "PRINCIPAL"]),
    studentController.getBulkUploadRules
);

/*
    ================================================
    @route   GET /api/students/bulk-upload/template
    @desc    Download Excel template for bulk upload
    @access  Teacher/Admin/Principal
    ================================================
*/
router.get(
    "/bulk-upload/template",
    auth,
    requireAnyRole(["ADMIN", "TEACHER", "PRINCIPAL"]),
    studentController.downloadBulkUploadTemplate
);

/*
    ================================
    @route   GET /api/students/:id
    @desc    Get a single student by id
    @access  Authenticated (Teacher/Admin)
    ================================
*/
router.get("/:id", auth, requireAnyRole(["ADMIN", "TEACHER", "PRINCIPAL"]), studentController.getStudentById);

/*
    ====================================================
    @route   GET /api/students/:id/attendance-history
    @desc    Get attendance history for a student
    @access  Authenticated (Teacher/Admin)
    ====================================================
*/
router.get(
    "/:id/attendance-history",
    auth,
    requireAnyRole(["ADMIN", "TEACHER", "PRINCIPAL"]),
    studentController.getStudentAttendanceHistory
);

/*
    ================================
    @route   POST /api/students
    @desc    Add a single student
    @access  Teacher/Admin
    ================================
*/
router.post("/", auth, requireAnyRole(["ADMIN", "TEACHER"]), studentController.createStudent);

/*
    ================================
    @route   PUT /api/students/:id
    @desc    Update student details
    @access  Teacher/Admin
    ================================
*/
router.put("/:id", auth, requireAnyRole(["ADMIN", "TEACHER"]), studentController.updateStudent);

/*
    ================================
    @route   DELETE /api/students/:id
    @desc    Delete a student record
    @access  Admin
    ================================
*/
router.delete("/:id", auth, requireRole("ADMIN"), studentController.deleteStudent);

/*
    ================================================
    @route   POST /api/students/bulk-upload
    @desc    Upload Excel file (.xlsx) and add students
             Excel columns required:
             name, rollNumber, dob, gender (headers are case/spacing-insensitive)
    @access  Teacher/Admin
    ================================================
*/
router.post(
    "/bulk-upload",
    auth,
    requireAnyRole(["ADMIN", "TEACHER"]),
    uploadExcel,
    studentController.bulkUpload
);

/*
    ================================================
    @route   POST /api/students/bulk-photo-upload
    @desc    Upload ZIP file of student photos
             Expects ZIP file with images named by rollNumber (e.g., 101.jpg)
    @access  Teacher/Admin
    ================================================
*/
router.post(
    "/bulk-photo-upload",
    auth,
    requireAnyRole(["ADMIN", "TEACHER"]),
    uploadZip,
    bulkPhotoController.uploadBulkPhotos
);

module.exports = router;