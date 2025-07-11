import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, Settings, LogOut } from "lucide-react";
import { Timer } from "@/components/timer";
import { TimelineView } from "@/components/timeline-view";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationPermissionBanner } from "@/components/notification-permission-banner";
import { useLocation } from "wouter";
import { formatDuration, formatTime } from "@/lib/utils";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: timesheetData, isLoading } = useQuery({
    queryKey: ["/api/timesheet"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  if (!user) return <div></div>;

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
              
              {user.isStaff && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              )}
              
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
        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />
        
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
              <div className="space-y-4">
                <TimelineView data={timesheetData} />
                
                {/* Modern Session Cards */}
                <div className="space-y-3 mt-6">
                  {timesheetData?.sessions?.slice(0, 5).map((session) => {
                    const startDate = new Date(session.startAt);
                    const endDate = session.endAt ? new Date(session.endAt) : null;
                    
                    // Check if session spans midnight
                    const spansAcrossMidnight = endDate && startDate.toDateString() !== endDate.toDateString();
                    
                    return (
                      <div key={session.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Status indicator */}
                            <div className={`w-3 h-3 rounded-full ${
                              session.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                            }`}></div>
                            
                            {/* Session details */}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-slate-900">
                                  {startDate.toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </span>
                                {spansAcrossMidnight && (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                    Spans midnight
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-600 mt-1">
                                {formatTime(session.startAt)} → {session.endAt ? formatTime(session.endAt) : 'Active'}
                                {spansAcrossMidnight && endDate && (
                                  <span className="ml-2 text-xs text-amber-600">
                                    (ended {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Duration and status */}
                          <div className="text-right">
                            <div className="font-semibold text-slate-900">
                              {session.duration ? formatDuration(session.duration) : 'Running'}
                            </div>
                            <div className={`text-xs mt-1 ${
                              session.isActive ? 'text-green-600' : 'text-slate-500'
                            }`}>
                              {session.isActive ? 'In Progress' : 'Completed'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!timesheetData?.sessions || timesheetData.sessions.length === 0) && (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No sessions recorded yet</p>
                      <p className="text-slate-400 text-sm mt-1">Start the timer above to begin tracking your time!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
