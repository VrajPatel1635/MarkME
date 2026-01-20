import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileArchive,
  GraduationCap,
  ArrowLeft,
  MoreVertical,
  Mail,
  Phone,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Loader from "../../components/common/Loader";
import { fetchClassroomStudents, deleteStudent } from "../../api/student.api";
import AddStudentForm from "../../components/forms/AddStudentForm";
import BulkStudentUploadForm from "../../components/forms/BulkStudentUploadForm";
import EditStudentForm from "../../components/forms/EditStudentForm";
import { useAdmin } from "../../context/adminContext";

const ClassroomDetail = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { classrooms } = useAdmin();

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkMode, setBulkMode] = useState("excel");

  // Tracks whether Excel bulk upload has completed (in this UI session) for this class.
  const [excelUploaded, setExcelUploaded] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [rowBusyId, setRowBusyId] = useState(null);

  // UI confirm modal (replaces window.confirm)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);

  // inline/screen alert (replaces window.alert)
  const [screenAlert, setScreenAlert] = useState(null);

  const currentClassroom = useMemo(() => {
    return classrooms.find(c => c.id === classId);
  }, [classrooms, classId]);

  const load = async () => {
    setLoading(true);
    const data = await fetchClassroomStudents(classId);
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    setExcelUploaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const filteredStudents = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return students;
    return students.filter((s) => {
      const name = String(s?.name ?? "").trim().toLowerCase();
      const roll = String(s?.rollNo ?? "").trim().toLowerCase();
      const gender = String(s?.gender ?? "").trim().toLowerCase();
      return name.includes(t) || roll.includes(t) || gender.includes(t);
    });
  }, [students, searchTerm]);

  const presenceKey = (searchTerm.trim().toLowerCase() || "all");

  const onDelete = (student) => {
    setPendingDeleteStudent(student);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const student = pendingDeleteStudent;
    if (!student) return;

    try {
      setRowBusyId(student.id);
      await deleteStudent(student.id);
      // Avoid full reload + re-animate: update locally so remaining students stay stable
      setStudents((prev) => prev.filter((x) => x.id !== student.id));
    } finally {
      setRowBusyId(null);
      setConfirmDeleteOpen(false);
      setPendingDeleteStudent(null);
    }
  };

  const openEdit = (student) => {
    setSelectedStudent(student);
    setIsEditOpen(true);
  };

  const openBulkExcel = () => {
    setBulkMode("excel");
    setOpenBulk(true);
  };

  const openBulkZip = () => {
    if (!excelUploaded) {
      setScreenAlert({
        type: "info",
        message:
          "Tip: Upload Bulk Excel first (student details). Then upload Bulk ZIP for photos.",
      });
      return;
    }
    setBulkMode("zip");
    setOpenBulk(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:pb-20 max-w-7xl mx-auto space-y-6">
      {/* Screen alert (non-blocking) */}
      <AnimatePresence>
        {screenAlert ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-(--primary-bg) border border-[rgb(var(--primary-accent-rgb)/0.12)] rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4"
          >
            <div className="text-sm text-(--primary-text)">
              <div className="font-bold">Note</div>
              <div className="text-(--primary-accent) opacity-80">{screenAlert.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setScreenAlert(null)}
              className="p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors text-(--primary-accent)"
              aria-label="Close alert"
            >
              <X size={18} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDeleteOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:backdrop-blur-sm bg-[rgb(var(--primary-text-rgb)/0.5)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className="bg-(--primary-bg) w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[rgb(var(--primary-accent-rgb)/0.1)]"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="bg-(--primary-accent) p-6 flex justify-between items-center text-(--primary-bg)">
                <div>
                  <h3 className="text-xl font-bold">Delete Student</h3>
                  <p className="text-(--secondary-accent) text-sm opacity-90">This action cannot be undone</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (rowBusyId) return;
                    setConfirmDeleteOpen(false);
                    setPendingDeleteStudent(null);
                  }}
                  className="p-2 hover:bg-red-500 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-sm text-(--primary-text)">
                  Are you sure you want to delete <span className="font-bold">{pendingDeleteStudent?.name}</span> (Roll {pendingDeleteStudent?.rollNo})?
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (rowBusyId) return;
                      setConfirmDeleteOpen(false);
                      setPendingDeleteStudent(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.12)] text-(--primary-accent) font-semibold hover:bg-slate-100 transition-colors disabled:opacity-60"
                    disabled={!!rowBusyId}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold shadow-[0_10px_15px_-3px_rgba(239,68,68,0.25),0_4px_6px_-4px_rgba(239,68,68,0.25)] hover:bg-red-600 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:bg-red-500"
                    disabled={!!rowBusyId}
                  >
                    {rowBusyId ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AddStudentForm
        isOpen={openAdd}
        onClose={() => setOpenAdd(false)}
        classroomId={classId}
        onCreated={load}
      />

      <BulkStudentUploadForm
        isOpen={openBulk}
        onClose={() => setOpenBulk(false)}
        classroomId={classId}
        mode={bulkMode}
        onUploaded={() => {
          if (bulkMode === "excel") setExcelUploaded(true);
          return load();
        }}
      />

      <EditStudentForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        classroomId={classId}
        student={selectedStudent}
        onUpdated={load}
      />

      {loading ? (
        <div className="flex justify-center items-center h-[60vh]">
          <Loader label="Loading classroom..." />
        </div>
      ) : (
        <>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--primary-bg) border border-[rgb(var(--primary-accent-rgb)/0.1)] text-(--primary-accent) font-semibold hover:bg-(--primary-accent) hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
          {/* Header */}
          <div className="bg-(--primary-bg) p-6 rounded-2xl border border-[rgb(var(--primary-accent-rgb)/0.05)] shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-(--secondary-bg) flex items-center justify-center shadow-inner">
                  <Users className="text-(--secondary-accent)" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-(--primary-text)">
                    {currentClassroom ? `${currentClassroom.std}-${currentClassroom.div}` : 'Classroom Detail'}
                  </h1>
                  <p className="text-sm text-(--primary-accent) opacity-60 font-medium">
                    {currentClassroom?.year} • {students.length} Students
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => setOpenAdd(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-(--primary-accent) text-(--primary-bg) font-bold shadow-lg shadow-[rgb(var(--primary-accent-rgb)/0.2)] hover:bg-(--primary-text) transition-all"
                >
                  <Plus size={18} /> Add Student
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openBulkExcel}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.1)] bg-(--primary-bg) hover:bg-(--secondary-bg) text-(--primary-accent) transition-colors relative group"
                    title="Upload Bulk Excel"
                  >
                    <FileSpreadsheet size={20} /> Upload Bulk Excel
                  </button>
                  <button
                    type="button"
                    onClick={openBulkZip}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-[rgb(var(--primary-accent-rgb)/0.1)] bg-(--primary-bg) hover:bg-(--secondary-bg) text-(--primary-accent) transition-colors"
                    title="Upload Bulk ZIP (Photos)"
                  >
                    <FileArchive size={20} /> Upload Bulk Zip
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-(--primary-accent) opacity-60 bg-(--secondary-bg)/50 p-2 rounded-lg w-fit">
              <span className="font-bold flex items-center gap-1 border border-[rgb(var(--primary-accent-rgb)/0.1)] px-1.5 py-0.5 rounded bg-(--primary-bg)">
                Tip
              </span>
              <span>
                Upload <span className="font-bold">Bulk Excel</span> first (for details), then <span className="font-bold">Bulk ZIP</span> (for photos).
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--primary-accent) opacity-40" size={20} />
        <input
          className="w-full pl-12 pr-4 py-3 border border-[rgb(var(--primary-accent-rgb)/0.1)] rounded-xl bg-(--primary-bg) focus:outline-none focus:border-(--secondary-accent) focus:ring-1 focus:ring-(--secondary-accent) shadow-sm transition-all"
          placeholder="Search students by name, roll no..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Students Grid */}
      <motion.div
        key={presenceKey}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredStudents.map((s) => (
            <motion.div
              layout={false}
              key={s.id}
              variants={itemVariants}
              exit={{ opacity: 0, scale: 0.9 }}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (rowBusyId === s.id) return;
                navigate(`/admin/student/${s.id}`);
              }}
              onKeyDown={(e) => {
                if (rowBusyId === s.id) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/admin/student/${s.id}`);
                }
              }}
              className="bg-(--primary-bg) border border-[rgb(var(--primary-accent-rgb)/0.05)] rounded-2xl hover:shadow-lg transition-all group relative overflow-hidden flex cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--secondary-accent) focus:ring-offset-2 focus:ring-offset-(--primary-bg)"
            >
              {/* Left Stripe Decoration */}
              <div className="w-1.5 bg-(--secondary-accent)" />

              <div className="p-4 flex gap-4 w-full items-center">

                {/* Photo */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shadow-inner border border-[rgb(var(--primary-accent-rgb)/0.05)]">
                    <img
                      src={s.photo}
                      alt={s.name}
                      className="w-full h-full object-cover bg-(--secondary-bg)"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full gap-1">
                  <div className="flex items-center gap-5 min-w-0">
                    <h3 className="font-bold text-(--primary-text) text-lg truncate" title={s.name}>
                      {s.name}
                    </h3>
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-(--secondary-bg) text-(--primary-accent) border border-[rgb(var(--primary-accent-rgb)/0.1)]">
                      {s.rollNo}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-(--primary-accent) opacity-60">
                    <span className="uppercase tracking-wider">{s.gender}</span>
                    <span>•</span>
                    <span>Student</span>
                  </div>

                  {/* Actions - appear on hover (desktop) or always visible if needed */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/student/${s.id}`);
                      }}
                      className="text-xs font-semibold px-2 py-1 rounded-md bg-(--secondary-bg) text-(--primary-accent) hover:bg-(--secondary-accent) hover:text-(--secondary-bg) transition-colors"
                    >
                      Profile
                    </button>
                    <div className="ml-auto flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        disabled={rowBusyId === s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(s);
                        }}
                        className="p-1.5 hover:bg-(--secondary-bg) rounded-full text-(--primary-accent)"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        disabled={rowBusyId === s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-full text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Row deleting overlay */}
              <AnimatePresence>
                {rowBusyId === s.id ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[rgb(var(--primary-bg-rgb)/0.75)] backdrop-blur-[1px] flex items-center justify-center"
                  >
                    <div className="flex items-center gap-3 text-sm font-bold text-(--primary-text)">
                      <span className="h-4 w-4 rounded-full border-2 border-[rgb(var(--primary-accent-rgb)/0.35)] border-t-[rgb(var(--primary-accent-rgb)/0.95)] animate-spin" />
                      Deleting…
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredStudents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-(--primary-accent) opacity-40">
          <div className="w-16 h-16 bg-(--secondary-bg) rounded-full flex items-center justify-center mb-4">
            <Search size={24} />
          </div>
          <p className="text-lg font-medium">No students found</p>
          <p className="text-sm">Try adjusting your search criteria</p>
        </div>
      )}

        </>
      )}
    </motion.div>
  );
};

export default ClassroomDetail;
