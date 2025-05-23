
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Ticket, QrCode, ShoppingBag, LogOut } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';

const AdminNav = () => {
  const location = useLocation();
  const { logout } = useAdmin();

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/tickets', icon: Ticket, label: 'Ticket Management' },
    { path: '/admin/purchases', icon: ShoppingBag, label: 'Purchase History' },
    { path: '/admin/scanner', icon: QrCode, label: 'QR Scanner' },
  ];

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link to="/admin/dashboard" className="text-xl font-bold text-purple-600">
              Event Admin
            </Link>
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`flex items-center gap-2 ${
                        isActive ? 'bg-purple-600 hover:bg-purple-700' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline">View Public Site</Button>
            </Link>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNav;
