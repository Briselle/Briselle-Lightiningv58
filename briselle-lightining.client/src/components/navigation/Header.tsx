import { Search, Bell, User, Menu, X, Settings, Moon, Plus } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

function Header({ toggleSidebar, isSidebarOpen }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 mr-4"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hidden md:flex items-center relative">
          <input
            type="text"
            placeholder="Search..."

            className="pl-10 pr-4 py-2 rounded-md border border-gray-300 w-64 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
         </div>
      </div>

          <div className="flex items-center space-x-4">

          {/*Add new command button*/}
              <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 relative">
                  <Plus size={20} />
              </button>
          {/*Toggle between dark mode*/}
              <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 relative">
                  <Moon size={20} />
              </button>

              {/*Notifiactions List*/}
              <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 relative">
                  <Bell size={20} />
                  <span className="absolute top-0 right-0 h-4 w-4 bg-error rounded-full text-white text-xs flex items-center justify-center">
                    3
                  </span>
              </button>
              {/*Settings Menu*/}
              <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 relative">
                  <Settings size={20} />
              </button>
        
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
              <User size={16} />
            </div>
          </div>
          <div className="ml-2 hidden md:block">
            <div className="text-sm font-medium text-gray-900">Brighton Hans</div>
            <div className="text-xs text-gray-500">brighton.hans@gmail.com</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;