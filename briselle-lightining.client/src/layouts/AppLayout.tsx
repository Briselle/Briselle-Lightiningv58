import { useState } from 'react';
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
  const isNotionNestRoute = location.pathname.startsWith('/notion/');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="app-container flex h-screen overflow-hidden">
      {!isShareRoute && <Sidebar isOpen={isSidebarOpen} currentPath={location.pathname} />}

      <div className="flex flex-col flex-1 overflow-hidden">
        {!isShareRoute && <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />}

        <main
          className={`flex-1 overflow-auto ${isNotionNestRoute ? 'bg-[#fbfbfa] p-0' : isShareRoute ? 'bg-[#f3f3f3] p-0' : 'bg-[#f3f3f3] p-6'}`}
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