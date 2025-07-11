import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Download, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { SessionEditModal } from "@/components/session-edit-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Clock } from 'lucide-react';

export default function UserTimesheetEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["/api/admin/user", id, "sessions"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  if (!user?.isStaff) {
    setLocation("/");
    return <div></div>;
  }

  const selectedUser = users.find(u => u.id === parseInt(id));

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">User not found</h2>
          <Button onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/admin/session/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user", id, "sessions"] });
      toast({
        title: "Session deleted",
        description: "The session has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteSession = (sessionId: number) => {
    if (confirm("Are you sure you want to delete this session?")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const handleAddSession = async () => {
    // Create a default session for the current date
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // Default 1 hour session
    
    const defaultSession = {
      id: null,
      startAt: now.toISOString(),
      endAt: endTime.toISOString(),
      duration: 60,
      isActive: false,
      userId: parseInt(id),
      timesheetId: 1, // Default timesheet ID - we'll create one if needed
    };
    setSelectedSession(defaultSession);
    setIsAddModalOpen(true);
  };

  const handleExport = () => {
    // Create CSV content for user's sessions
    const headers = ['Date', 'Start Time', 'End Time', 'Duration', 'Status'];
    const rows = sessions.map(session => [
      new Date(session.startAt).toLocaleDateString(),
      new Date(session.startAt).toLocaleTimeString(),
      session.endAt ? new Date(session.endAt).toLocaleTimeString() : 'Active',
      formatDuration(session.duration),
      session.isActive ? 'Active' : 'Completed'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${userName.replace(' ', '_')}_timesheet_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const userInitials = `${selectedUser.firstName[0]}${selectedUser.lastName[0]}`;
  const userName = `${selectedUser.firstName} ${selectedUser.lastName}`;

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = new Date(session.startAt).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {});

  const formatDuration = (minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{userInitials}</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-800">{userName}'s Timesheet</h1>
                  <p className="text-sm text-slate-600">Edit sessions and manage time entries</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleAddSession}>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Timesheet Sessions</h3>
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
              <div className="space-y-3">
                {sessions.map((session) => {
                  const startDate = new Date(session.startAt);
                  const endDate = session.endAt ? new Date(session.endAt) : null;
                  
                  // Check if session spans midnight
                  const spansAcrossMidnight = endDate && startDate.toDateString() !== endDate.toDateString();
                  
                  return (
                    <div key={session.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Status indicator */}
                          <div className={`w-4 h-4 rounded-full ${
                            session.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                          }`}></div>
                          
                          {/* Session details */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-slate-900">
                                {startDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </h4>
                              {spansAcrossMidnight && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                  Spans midnight
                                </span>
                              )}
                              <Badge 
                                variant={session.isActive ? "default" : "secondary"}
                                className={session.isActive ? "bg-green-500" : ""}
                              >
                                {session.isActive ? 'Active' : 'Completed'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-6 text-sm text-slate-600">
                              <div className="flex items-center space-x-2">
                                <span className="text-slate-500">Start:</span>
                                <span className="font-medium">{formatTime(session.startAt)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-slate-500">End:</span>
                                <span className="font-medium">
                                  {session.endAt ? formatTime(session.endAt) : 'Active'}
                                </span>
                                {spansAcrossMidnight && endDate && (
                                  <span className="text-xs text-amber-600 ml-1">
                                    ({endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-slate-500">Duration:</span>
                                <span className="font-semibold text-slate-900">
                                  {session.duration ? formatDuration(session.duration) : 'Running'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSession(session)}
                            className="hover:bg-blue-50 hover:border-blue-200"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                            disabled={deleteSessionMutation.isPending}
                            className="hover:bg-red-50 hover:border-red-200 text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {sessions.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No sessions found for this user</p>
                    <p className="text-slate-400 text-sm mt-1">Sessions will appear here once the user starts tracking time</p>
                  </div>
                )}
              </div>
            )}

            {/* Monthly Total */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <div className="text-lg font-semibold text-slate-800">Monthly Total</div>
                <div className="text-2xl font-bold text-primary">
                  {formatDuration(sessions.reduce((total, session) => total + (session.duration || 0), 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Session Edit Modal */}
      <SessionEditModal
        isOpen={isModalOpen || isAddModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsAddModalOpen(false);
        }}
        session={selectedSession}
      />
    </div>
  );
}
