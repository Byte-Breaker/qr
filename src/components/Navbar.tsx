import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  History,
  LogOut,
  Menu as MenuIcon,
  Settings,
  User as UserIcon,
  ShieldCheck,
  X as XIcon,
  Sun, Moon,
  Smartphone,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ThemeToggle from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from './ui/sheet';
import { getCurrentEmployee, Employee } from '@/services/supabaseService';
import { cn, getInitials } from '@/lib/utils';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading: authIsLoading } = useAuth();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (user) {
        setIsLoadingEmployee(true);
        try {
        const data = await getCurrentEmployee(user);
          setEmployeeData(data);
        } catch (error) {
          console.error("Error fetching employee data:", error);
          setEmployeeData(null);
        } finally {
          setIsLoadingEmployee(false);
        }
      } else if (!authIsLoading) {
        setEmployeeData(null);
        setIsLoadingEmployee(false);
      }
    };
    
    fetchEmployeeData();
  }, [user, authIsLoading]);

  const getAvatarUrl = (): string | undefined => {
    return employeeData?.avatar_url || user?.user_metadata?.avatar_url;
  };
  
  const menuItems = useMemo(() => {
    const baseItems = [
      { path: '/', label: 'Panel', icon: <LayoutDashboard className="size-5" /> },
      { path: '/history', label: 'Geçmişim', icon: <History className="size-5" /> },
  ];
  if (employeeData?.role === 'admin') {
      baseItems.push({ path: '/admin', label: 'Yönetim Paneli', icon: <ShieldCheck className="size-5" /> });
  }
    return baseItems;
  }, [employeeData?.role]);

  const NavLink: React.FC<{ path: string; label: string; icon: React.ReactNode; onClick?: () => void; isMobile?: boolean }> = 
    ({ path, label, icon, onClick, isMobile }) => {
    const isActive = location.pathname === path;
  return (
                <Button
        variant="ghost"
        className={cn(
          "justify-start w-full text-base md:text-sm font-medium",
          isActive 
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/80",
          isMobile ? "py-3 px-4" : "px-3 py-2 md:justify-center",
        )}
        onClick={() => {
          navigate(path);
          if (onClick) onClick();
        }}
                >
        <span className={cn("mr-3", isMobile ? "" : "md:mr-2")}>{icon}</span>
        {label}
                </Button>
    );
  };
  
  const UserAvatarButton: React.FC = () => {
    if (authIsLoading || isLoadingEmployee) {
        return <Button variant="ghost" size="icon" className="rounded-full"><div className="size-8 bg-muted rounded-full animate-pulse" /></Button>;
    }
    if (!user || !employeeData) return null;

    return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative rounded-full p-0 w-10 h-10 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-colors">
                      <AvatarImage src={getAvatarUrl()} alt={employeeData.name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {getInitials(employeeData.name)}
                  </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">{employeeData.name}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {employeeData.email}
                  </p>
                </div>
              </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profilim</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Ayarlar</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await logout(); navigate('/login'); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
    );
  }

  return (
    <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden mr-2">
              <Button variant="ghost" size="icon" aria-label="Menüyü Aç">
                <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="w-72 sm:w-80 bg-card p-0 flex flex-col">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="flex items-center">
                         <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                            <img src="https://i.hizliresim.com/eh46dsr.png" alt="QR Takip Logo" className="h-8 object-contain" />
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                    <NavLink key={item.path} {...item} onClick={() => setIsMobileMenuOpen(false)} isMobile />
                  ))}
                </nav>
                <SheetFooter className="p-4 border-t mt-auto">
                    <div className="w-full space-y-2">
                        <NavLink path="/profile" label="Profilim" icon={<UserIcon className="size-5" />} onClick={() => setIsMobileMenuOpen(false)} isMobile />
                        <NavLink path="/settings" label="Ayarlar" icon={<Settings className="size-5" />} onClick={() => setIsMobileMenuOpen(false)} isMobile />
                    <Button
                            variant="ghost"
                            className="w-full justify-start text-base font-medium text-destructive hover:text-destructive-foreground hover:bg-destructive/90 py-3 px-4"
                            onClick={async () => {
                                await logout();
                                navigate('/login');
                                setIsMobileMenuOpen(false);
                      }}
                    >
                            <LogOut className="size-5 mr-3" />
                            Çıkış Yap
                    </Button>
                    </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>

          <Link to="/" className="hidden md:flex items-center gap-2 focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md">
            <img src="https://i.hizliresim.com/eh46dsr.png" alt="QR Takip Logo" className="h-8 object-contain" />
          </Link>
          </div>

        <nav className="hidden md:flex items-center gap-1">
          {menuItems.map((item) => (
            <NavLink key={item.path} {...item} />
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <UserAvatarButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;

