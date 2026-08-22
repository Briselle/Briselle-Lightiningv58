import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, 
  Database, 
  AlertTriangle,
  Settings, 
  Users, 
  ChevronLeft,
    ChevronRight,
    Building2,
    Package,
    Table,
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { supabase } from '../../utils/supabase';
import { getPickerIconNode, normalizeUiIconKey } from '../../utils/uiIconPickerCatalog';

interface SidebarProps {
  isOpen: boolean;
  currentPath: string;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

function Sidebar({ isOpen, currentPath }: SidebarProps) {
  const [activeObjectDataTarget, setActiveObjectDataTarget] = useState<{
    id: string;
    name: string;
    icon: string;
    objectCustomIcon?: string;
  }>({
    id: '1000000001',
    name: 'Accounts',
    icon: 'table',
    objectCustomIcon: '',
  });

  useEffect(() => {
    const readFromStorage = (): { id: string; name: string; icon: string; objectCustomIcon?: string } | null => {
      try {
        const raw = localStorage.getItem('activeObjectDataTarget');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { id?: unknown; name?: unknown; icon?: unknown; objectCustomIcon?: unknown };
        const id = String(parsed?.id ?? '').trim();
        const name = String(parsed?.name ?? '').trim();
        if (!id) return null;
        const custom = String(parsed?.objectCustomIcon ?? '').trim();
        return {
          id,
          name: name || `Object ${id}`,
          icon: normalizeUiIconKey(parsed?.icon),
          objectCustomIcon: custom || undefined,
        };
      } catch {
        return null;
      }
    };

    const apply = (next: { id: string; name: string; icon: string; objectCustomIcon?: string } | null) => {
      if (next) {
        setActiveObjectDataTarget(next);
      }
    };

    const fromStorage = readFromStorage();
    if (fromStorage) {
      apply(fromStorage);
    } else {
      const run = async () => {
        const { data } = await supabase
          .from('dobj')
          .select('sys_id,dobj_name_display,dobj_name_system')
          .eq('sys_id', 1000000001)
          .limit(1)
          .maybeSingle<{ sys_id?: number | null; dobj_name_display?: string | null; dobj_name_system?: string | null }>();
        const id = String(data?.sys_id ?? 1000000001);
        const objectName = String(data?.dobj_name_display ?? data?.dobj_name_system ?? 'Accounts').trim() || 'Accounts';
        const fallback = { id, name: objectName };
        const payload = { ...fallback, icon: 'table', objectCustomIcon: '' };
        setActiveObjectDataTarget(payload);
        try {
          localStorage.setItem('activeObjectDataTarget', JSON.stringify(payload));
        } catch {
          /* no-op */
        }
      };
      void run();
    }

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; name?: string; icon?: unknown; objectCustomIcon?: unknown }>).detail;
      const id = String(detail?.id ?? '').trim();
      if (!id) return;
      const name = String(detail?.name ?? '').trim() || `Object ${id}`;
      const custom = String(detail?.objectCustomIcon ?? '').trim();
      setActiveObjectDataTarget({
        id,
        name,
        icon: normalizeUiIconKey(detail?.icon),
        objectCustomIcon: custom || undefined,
      });
    };
    const onStorage = () => {
      apply(readFromStorage());
    };
    window.addEventListener('active-object-data-target-changed', onCustom as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('active-object-data-target-changed', onCustom as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      title: 'Entity',
      path: '/entity',
      icon: <Building2 size={20} />,
    },
    {
      title: 'Objects',
      path: '/objects',
      icon: <Package size={20} />,
    },
    {
      title: activeObjectDataTarget.name,
      path: `/objects/${activeObjectDataTarget.id}/records`,
      icon: getPickerIconNode(activeObjectDataTarget.icon, 20, activeObjectDataTarget.objectCustomIcon),
    },
    {
      title: 'Data',
      path: '/data',
      icon: <Database size={20} />,
    },
    {
      title: 'Users',
      path: '/users',
      icon: <Users size={20} />,
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />,
    },
    {
      title: 'Master Template',
      path: '/templist2',
      icon: <Table size={20} />,
    },
  ];

  const isItemActive = (itemPath: string): boolean => {
    if (/^\/objects\/[^/]+\/records$/.test(itemPath)) {
      return currentPath.startsWith(itemPath);
    }
    if (itemPath === '/objects') {
      // Keep Objects active for object management routes, but not object records routes.
      return (
        currentPath === '/objects' ||
        currentPath === '/objects/new' ||
        /^\/objects\/[^/]+(?:\/config)?$/.test(currentPath)
      );
    }
    return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
  };

  return (
    <aside
      className={cn(
        'bg-white shadow-sm transition-all duration-300 z-10 h-full',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <div className={cn("flex items-center", isOpen ? "" : "justify-center w-full")}>
          <div className="text-primary">
            <AlertTriangle size={28} />
          </div>
          
          {isOpen && (
            <span className="ml-2 font-bold text-gray-900 text-lg">
              Briselle
            </span>
          )}
        </div>
      </div>

      <nav className="mt-6 px-2">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  'sidebar-item',
                  isItemActive(item.path) && 'active',
                  !isOpen && 'justify-center px-2'
                )}
              >
                <span>{item.icon}</span>
                {isOpen && <span>{item.title}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;