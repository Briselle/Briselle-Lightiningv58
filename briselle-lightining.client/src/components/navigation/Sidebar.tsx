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
    Zap
} from 'lucide-react';
import { cn } from '../../utils/helpers';

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
      title: 'Demo Table',
      path: '/demo',
      icon: <Zap size={20} />,
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
          title: 'Templates',
          path: '/templist',
          icon: <Table size={20} />,
      },
      {
          title: 'Demo Table',
          path: '/demo',
          icon: <Zap size={20} />,
      },
  ];

  return (
    <aside
      className={cn(
        'bg-white shadow-sm transition-all duration-300 z-10',
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
                  currentPath.startsWith(item.path) && 'active',
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