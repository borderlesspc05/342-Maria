import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { NotificationInitializer } from '../NotificationInitializer';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_KEY = "sidebar_collapsed";

const getInitialCollapsed = (): boolean => {
  if (typeof window === "undefined") return true;
  if (window.innerWidth <= 768) return true;
  const saved = localStorage.getItem(SIDEBAR_KEY);
  /* Se nunca foi salvo, começa fechada por padrão */
  return saved !== null ? saved === "true" : true;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsed);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768
  );
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined" && window.innerWidth > 768) {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showSidebarOverlay = isMobile && !sidebarCollapsed;

  return (
    <div className="layout">
      <NotificationInitializer />
      {showSidebarOverlay && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
          onKeyDown={(e) => e.key === 'Escape' && toggleSidebar()}
          role="button"
          tabIndex={0}
          aria-label="Fechar menu"
        />
      )}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={`layout-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuClick={toggleSidebar} collapsed={sidebarCollapsed} />
        <main className="layout-content">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

