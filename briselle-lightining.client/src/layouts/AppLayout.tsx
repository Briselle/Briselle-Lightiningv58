import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import Header from '../components/navigation/Header';
import { ZivaChat } from '../modules/ziva-chat-module/src/index.js';
import '../modules/ziva-chat-module/src/ZivaChat.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const isShareRoute = new URLSearchParams(location.search).has('share');
  const isNotionNestRoute = location.pathname.toLowerCase().includes('/notion');

  const appContainerRef = useRef<HTMLDivElement>(null);
  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (isNotionNestRoute) {
      document.documentElement.style.setProperty('overflow', 'visible', 'important');
      document.body.style.setProperty('overflow', 'visible', 'important');
      document.documentElement.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('height', 'auto', 'important');
      if (rootEl) {
        rootEl.style.setProperty('overflow', 'visible', 'important');
        rootEl.style.setProperty('height', 'auto', 'important');
      }
      if (appContainerRef.current) {
        appContainerRef.current.style.setProperty('overflow', 'visible', 'important');
        appContainerRef.current.style.setProperty('height', 'auto', 'important');
        appContainerRef.current.style.setProperty('min-height', '100vh', 'important');
      }
      if (mainWrapperRef.current) {
        mainWrapperRef.current.style.setProperty('overflow', 'visible', 'important');
        mainWrapperRef.current.style.setProperty('height', 'auto', 'important');
        mainWrapperRef.current.style.setProperty('min-height', '100vh', 'important');
      }
      if (mainRef.current) {
        mainRef.current.style.setProperty('overflow', 'visible', 'important');
        mainRef.current.style.setProperty('height', 'auto', 'important');
      }
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
      if (rootEl) {
        rootEl.style.overflow = '';
        rootEl.style.height = '';
      }
      if (appContainerRef.current) {
        appContainerRef.current.style.overflow = '';
        appContainerRef.current.style.height = '';
        appContainerRef.current.style.minHeight = '';
      }
      if (mainWrapperRef.current) {
        mainWrapperRef.current.style.overflow = '';
        mainWrapperRef.current.style.height = '';
        mainWrapperRef.current.style.minHeight = '';
      }
      if (mainRef.current) {
        mainRef.current.style.overflow = '';
        mainRef.current.style.height = '';
      }
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
      if (rootEl) {
        rootEl.style.overflow = '';
        rootEl.style.height = '';
      }
      if (appContainerRef.current) {
        appContainerRef.current.style.overflow = '';
        appContainerRef.current.style.height = '';
        appContainerRef.current.style.minHeight = '';
      }
      if (mainWrapperRef.current) {
        mainWrapperRef.current.style.overflow = '';
        mainWrapperRef.current.style.height = '';
        mainWrapperRef.current.style.minHeight = '';
      }
      if (mainRef.current) {
        mainRef.current.style.overflow = '';
        mainRef.current.style.height = '';
      }
    };
  }, [isNotionNestRoute]);

  return (
    <div 
      ref={appContainerRef}
      className={`app-container flex ${isNotionNestRoute ? 'min-h-screen h-auto overflow-visible w-full' : 'h-screen overflow-hidden'}`}
    >
      {!isShareRoute && (
        <div className={isNotionNestRoute ? "sticky top-0 h-screen z-10" : ""}>
          <Sidebar isOpen={isSidebarOpen} currentPath={location.pathname} />
        </div>
      )}

      <div 
        ref={mainWrapperRef}
        className={`flex flex-col flex-1 ${isNotionNestRoute ? 'min-h-screen h-auto overflow-visible w-full' : 'h-screen min-h-0 overflow-hidden'}`}
      >
        {!isShareRoute && (
          <div className={isNotionNestRoute ? "sticky top-0 z-[1050]" : ""}>
            <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          </div>
        )}

        <main
          ref={mainRef}
          className={`flex-1 ${isNotionNestRoute ? 'overflow-visible bg-[#fbfbfa] p-0' : isShareRoute ? 'bg-[#f3f3f3] p-0 overflow-y-auto overflow-x-hidden h-full' : 'bg-[#f3f3f3] p-6 overflow-y-auto overflow-x-hidden h-full'}`}
        >
          {children}
        </main>
      </div>

      {!isShareRoute && (
        <ZivaChat
          config={{
            api: {
              baseUrl: import.meta.env.VITE_ZIVA_API_URL,
            },
            routes: {
              learnMorePath: '/dashboard',
              learnMoreLabel: 'Dashboard',
              homePath: '/dashboard',
            },
            assets: {
              logo: '/assets/briselle-logo.svg',
              sparkle: '/assets/ziva_sparkle_white.svg',
            },
          }}
        />
      )}
    </div>
  );
}

export default AppLayout;