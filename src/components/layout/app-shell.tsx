"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarCheck,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Clock,
  X,
  ArrowRightToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardView from "@/components/dashboard/dashboard-view";
import RoomsView from "@/components/rooms/rooms-view";
import GuestsView from "@/components/guests/guests-view";
import CheckInView from "@/components/stays/check-in-view";
import ReservationsView from "@/components/reservations/reservations-view";
import CompaniesView from "@/components/companies/companies-view";
import ReportsView from "@/components/reports/reports-view";
import SettingsView from "@/components/settings/settings-view";
import { ThemeButton } from "../ui/mode-toggle";
import { Logo } from "../ui/logo";

interface AppShellProps {
  user: { id: string; name: string; email: string; role: string };
  currentView: string;
  viewParams: Record<string, string>;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onLogout: () => void;
}

const navItems = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    roles: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT"],
  },
  {
    key: "rooms",
    label: "الغرف",
    icon: BedDouble,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    key: "guests",
    label: "الضيوف",
    icon: Users,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    key: "checkin",
    label: "تسجيل الدخول/الخروج",
    icon: CalendarCheck,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    key: "reservations",
    label: "الحجوزات",
    icon: CalendarCheck,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    key: "companies",
    label: "الشركات",
    icon: Building2,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    key: "reports",
    label: "التقارير",
    icon: BarChart3,
    roles: ["ADMIN", "ACCOUNTANT"],
  },
  { key: "settings", label: "الإعدادات", icon: Settings, roles: ["ADMIN"] },
];

const ROLE_AR: Record<string, string> = {
  ADMIN: "مدير",
  RECEPTIONIST: "استقبال",
  ACCOUNTANT: "محاسب",
};

export function AppShell({
  user,
  currentView,
  viewParams,
  onNavigate,
  onLogout,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleString("ar-EG", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (key: string) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    onNavigate("guests", { search: globalSearch.trim() });
    setGlobalSearch("");
    setShowMobileSearch(false);
  };

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const roleColor =
    user.role === "ADMIN"
      ? "default"
      : user.role === "RECEPTIONIST"
        ? "secondary"
        : "outline";

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView onNavigate={onNavigate} />;
      case "rooms":
        return <RoomsView roomId={viewParams.roomId} onNavigate={onNavigate} />;
      case "guests":
        return (
          <GuestsView
            guestId={viewParams.guestId}
            search={viewParams.search}
            onNavigate={onNavigate}
          />
        );
      case "checkin":
        return (
          <CheckInView
            userId={user.id}
            stayId={viewParams.stayId}
            onNavigate={onNavigate}
          />
        );
      case "reservations":
        return <ReservationsView onNavigate={onNavigate} />;
      case "companies":
        return (
          <CompaniesView
            companyId={viewParams.companyId}
            onNavigate={onNavigate}
          />
        );
      case "reports":
        return <ReportsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:sticky top-0 right-0 z-50 h-screen
        bg-card border-l border-border
        transition-all duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        ${sidebarOpen ? "w-64" : "w-0 lg:w-16"}
        overflow-hidden flex-shrink-0 !px-3

      `}
      >
        <div className="h-full flex flex-col w-64">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-border h-16 flex-shrink-0">
            <Logo  sizeParam="md"/>
            {sidebarOpen && (
              <span className="font-bold text-lg whitespace-nowrap">
                 Hotel
              </span>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2 w-full">
            <nav className="space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    className={`
                      w-full flex justify-start  items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="py-3 pl-3 border-t border-border">
            <div className="flex items-center  gap-3 px-1">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <Badge
                    variant={roleColor as any}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {ROLE_AR[user.role] || user.role}
                  </Badge>
                </div>
              )}
              {sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ArrowRightToLine
              className={`w-5 h-5 transition-transform ${!sidebarOpen ? "rotate-180" : ""}`}
            />
          </Button>
          <ThemeButton />

          {/* Search Bar */}
          <form
            onSubmit={handleGlobalSearch}
            className="hidden sm:flex flex-1 max-w-md"
          >
            <div className="relative w-full">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الهاتف أو جواز السفر..."
                className="pr-9 h-9"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          </form>

          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:hidden"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
            >
              <Search className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="الإشعارات"
            >
              <Bell className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="p-3 border-b border-border bg-card sm:hidden">
            <form onSubmit={handleGlobalSearch}>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-9"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{renderView()}</main>
      </div>
    </div>
  );
}
