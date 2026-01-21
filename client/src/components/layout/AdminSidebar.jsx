import React from 'react';
import { Users, School, LayoutDashboard, Settings, LogOut, Download } from 'lucide-react';
import { useAdmin } from '../../context/adminContext';
import { useAuth } from '../../context/authContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import usePWAInstall from '../../hooks/usePWAInstall';

const SidebarItem = ({ icon: Icon, label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
      ? 'bg-(--primary-accent) text-(--primary-bg) shadow-lg shadow-[rgb(var(--primary-accent-rgb)/0.2)]'
      : 'text-(--primary-accent) opacity-70 hover:opacity-100 hover:bg-(--secondary-bg) hover:text-(--primary-text)'
      }`}
  >
    <Icon
      size={20}
      className={
        active
          ? 'text-(--secondary-accent)'
          : 'text-[rgb(var(--primary-accent-rgb)/0.5)] group-hover:text-(--primary-accent)'
      }
    />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="activeDot" className="ml-auto w-1.5 h-1.5 rounded-full bg-(--secondary-accent)" />}
  </button>
);

const DEFAULT_ADMIN_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: Users, label: 'Teachers', to: '/admin/teachers' },
  { icon: School, label: 'Classrooms', to: '/admin/classrooms' },
  { icon: Users, label: 'Principal', to: '/admin/principal' },
];

const isItemActive = (currentPath, item) => {
  if (!item) return false;
  const prefixes = Array.isArray(item.activePrefixes) ? item.activePrefixes : null;
  if (prefixes && prefixes.length > 0) {
    return prefixes.some((p) => currentPath === p || currentPath.startsWith(`${p}/`));
  }
  return currentPath === item.to || (item.to === '/admin/dashboard' && currentPath === '/admin');
};

const AdminSidebar = ({ isMobile, isMobileMenuOpen, items, brandLabel = 'EduAdmin', showSettings = true, onClose }) => {
  const { adminProfile } = useAdmin();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { isInstallable, installApp } = usePWAInstall();

  const currentPath = location.pathname;

  const goTo = (path) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const resolvedItems = Array.isArray(items) && items.length > 0 ? items : DEFAULT_ADMIN_ITEMS;

  const navItems = resolvedItems.map((item) => ({
    ...item,
    active: isItemActive(currentPath, item),
    onClick: () => goTo(item.to),
  }));

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
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-(--primary-text) flex items-center justify-center">
          <School className="text-(--secondary-accent)" size={20} />
        </div>
        <span className="text-xl font-bold text-(--primary-text)">{brandLabel}</span>
      </div>

      <motion.nav variants={containerVariants} initial="hidden" animate="show" className="flex-1 space-y-2">
        {navItems.map((item) => (
          <motion.div key={item.label} variants={itemVariants}>
            <SidebarItem {...item} />
          </motion.div>
        ))}
        {(isInstallable || showSettings) && (
          <>
            <motion.div
              variants={itemVariants}
              className="pt-8 pb-2 px-4 text-xs font-bold text-(--primary-accent) opacity-40 uppercase tracking-wider"
            >
              System
            </motion.div>

            {isInstallable && (
              <motion.div variants={itemVariants}>
                <SidebarItem
                  icon={Download}
                  label="📲 Install App"
                  onClick={async () => {
                    await installApp();
                    if (isMobile && onClose) {
                      onClose();
                    }
                  }}
                />
              </motion.div>
            )}

            {showSettings && (
              <motion.div variants={itemVariants}>
                <SidebarItem icon={Settings} label="Settings" />
              </motion.div>
            )}
          </>
        )}
      </motion.nav>

      <div className="mt-auto pt-6 border-t border-[rgb(var(--primary-accent-rgb)/0.05)]">
        <button
          onClick={async () => {
            navigate('/login', { replace: true, state: { forceRoleRedirect: true } });
            await logout();
          }}
          className="flex items-center gap-3 px-4 py-3 text-(--primary-accent) opacity-60 hover:opacity-100 hover:text-white hover:bg-red-500 rounded-xl w-full transition-colors cursor-pointer"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* Remove admin profile section from mobile sidebar */}
      {false && isMobile && (
        <div className="mt-6 border-t border-[rgb(var(--primary-accent-rgb)/0.1)] pt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-(--primary-accent) overflow-hidden border border-[rgb(var(--secondary-accent-rgb)/0.5)]">
            <img src={adminProfile?.avatar} alt="Mobile Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-(--primary-text)">{adminProfile?.name}</p>
            <p className="text-xs text-(--primary-accent) opacity-60">{adminProfile?.email}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="lg:hidden fixed top-20 left-0 w-64 h-[calc(100%-5rem)] bg-(--primary-bg) z-20 p-6 shadow-2xl border-r border-[rgb(var(--primary-accent-rgb)/0.05)]"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-(--primary-bg) border-r border-[rgb(var(--primary-accent-rgb)/0.05)] h-full p-6">
      {content}
    </aside>
  );
};

export default AdminSidebar;
