import { NavItem } from '@/types/driver';
import { HiLogout } from 'react-icons/hi';
import OnlineToggle from '../onlineToggle';

interface SidebarProps {
  activeNav: string;
  navItems: NavItem[];
  user: any;
  isOnline: boolean;
  onNavChange: (navId: string) => void;
  onToggleOnline: (online: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({
  activeNav,
  navItems,
  user,
  isOnline,
  onNavChange,
  onToggleOnline,
  onLogout
}: SidebarProps) {
  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">SwiftRide Driver</h1>
        <p className="text-sm text-gray-600 mt-1">Welcome, {user?.displayName}</p>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeNav === item.id
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t mt-auto">
        <OnlineToggle isOnline={isOnline} onToggle={onToggleOnline} />
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mt-4"
        >
          <HiLogout className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}