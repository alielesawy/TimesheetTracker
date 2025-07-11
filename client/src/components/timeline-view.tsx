import { useMemo } from "react";
import { formatDuration, formatTime, formatDate } from "@/lib/utils";
import { Clock, CheckCircle, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineViewProps {
  data?: {
    sessions: Array<{
      id: number;
      startAt: string;
      endAt: string | null;
      duration: number | null;
      isActive: boolean;
    }>;
  };
}

export function TimelineView({ data }: TimelineViewProps) {
  const sessionsByDate = useMemo(() => {
    if (!data?.sessions) return {};

    return data.sessions.reduce((acc, session) => {
      const date = new Date(session.startAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(session);
      return acc;
    }, {} as Record<string, typeof data.sessions>);
  }, [data]);

  if (!data?.sessions || data.sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">No sessions recorded yet</p>
        <p className="text-slate-400 text-sm mt-1">Start the timer above to begin tracking your time!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(sessionsByDate)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, sessions]) => {
          const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);

          return (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <div className="flex items-center space-x-3">
                  <h4 className="font-semibold text-lg text-slate-800">
                    {formatDate(date)}
                  </h4>
                  <span className="text-sm text-slate-500">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
                <div className="font-bold text-slate-700 text-lg">
                  {formatDuration(totalDuration)}
                </div>
              </div>

              {/* Sessions List for the Day */}
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-white border border-slate-200 rounded-lg p-4 transition-colors hover:border-primary/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${session.isActive ? 'bg-green-100' : 'bg-slate-100'}`}>
                          {session.isActive ? (
                            <Hourglass className="h-5 w-5 text-green-600 animate-spin" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">
                            {formatTime(session.startAt)} → {session.endAt ? formatTime(session.endAt) : 'Now'}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            Duration: <span className="font-medium">{session.duration ? formatDuration(session.duration) : 'Running...'}</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant={session.isActive ? "default" : "secondary"} className={session.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                        {session.isActive ? 'Active' : 'Completed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {/* Monthly Total */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold text-slate-800">Monthly Total</div>
          <div className="text-2xl font-bold text-primary">
            {formatDuration(
              data.sessions.reduce((total, session) => total + (session.duration || 0), 0)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}