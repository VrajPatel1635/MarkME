// src/components/common/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ClipboardCheck, Menu, X, LayoutDashboard, Download } from "lucide-react";
import usePWAInstall from "../../hooks/usePWAInstall";

const NAV_ITEMS_BY_ROLE = {
  teacher: [
    {
      label: "Students",
      path: "/teacher/classroom",
      icon: Users,
    },
    {
      label: "Attendance",
      path: "/teacher/attendance",
      icon: ClipboardCheck,
    },
  ],
  principal: [
    {
      label: "Dashboard",
      path: "/principal/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Teachers",
      path: "/principal/teachers",
      icon: Users,
    },
    {
      label: "Classrooms",
      path: "/principal/classrooms",
      icon: ClipboardCheck,
    },
  ],
};

const Sidebar = ({ isSidebarOpen, toggleSidebar, role = "teacher" }) => {
  // Use the passed prop for visibility state
  const navItems = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.teacher;
  const panelLabel = role === "principal" ? "Principal Panel" : "Teacher Panel";

  const { isInstallable, installApp } = usePWAInstall();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-(--primary-accent) text-white overflow-hidden">
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 min-w-[256px]">
        <h1 className="text-xl font-jakarta font-bold tracking-tight text-(--secondary-accent)">
          MarkMe
        </h1>
        {/* Close button for mobile */}
        <button
          className="lg:hidden text-white/50 hover:text-white"
          onClick={toggleSidebar}
          style={{ cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 min-w-[256px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                // Close sidebar on mobile when a link is clicked
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className="relative block group"
            >
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Active Soft Signal Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-(--secondary-accent) rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-sm font-jakarta font-semibold tracking-wide`}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          );
        })}

        {isInstallable && (
          <motion.button
            type="button"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              await installApp();
              if (window.innerWidth < 1024) toggleSidebar();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/50 hover:text-white hover:bg-white/5"
            style={{ cursor: 'pointer' }}
          >
            <Download size={20} />
            <span className="text-sm font-jakarta font-semibold tracking-wide">📲 Install App</span>
          </motion.button>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-6 border-t border-white/5 min-w-[256px]">
        {/* User Info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-(--secondary-accent)/20 flex items-center justify-center text-(--secondary-accent)">
            <LayoutDashboard size={16} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white uppercase tracking-widest truncate">{panelLabel}</p>
            <p className="text-[10px] text-white/40 truncate">v1.0.4 - Stable</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Collapsible) */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? 256 : 0,
          opacity: isSidebarOpen ? 1 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex h-screen sticky top-0 flex-col overflow-hidden"
      >
        <div className="w-64 h-full">
          <SidebarContent />
        </div>
      </motion.aside>

      {/* Mobile Sidebar (Drawer Overlay) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;