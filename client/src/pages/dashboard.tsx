import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, Settings, LogOut } from "lucide-react";
import { Timer } from "@/components/timer";
import { TimelineView } from "@/components/timeline-view";
import { NotificationBell } from "@/components/notification-bell";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: timesheetData, isLoading } = useQuery({
    queryKey: ["/api/timesheet"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setLocation("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const userInitials = `${user.firstName[0]}${user.lastName[0]}`;
  const userName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <Clock className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">
                  {settings?.companyName || "TimeTracker Pro"}
                </h1>
                <p className="text-sm text-slate-600">Your time, simplified</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBell />
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{userInitials}</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{userName}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Timer Section */}
        <div className="text-center mb-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Track Your Time</h2>
            <p className="text-slate-600 mb-8">Focus on what matters. We'll handle the rest.</p>
            
            <Timer />
          </div>
        </div>

        {/* Timesheet Section */}
        <Card>
          <CardContent className="p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Timesheet</h3>
                  <p className="text-slate-600 text-sm">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <TimelineView data={timesheetData} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
