import { useMemo } from "react";

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
    }, {});
  }, [data]);

  const formatDuration = (minutes: number) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getSessionPosition = (startTime: string) => {
    const start = new Date(startTime);
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 100; // Convert to percentage of day
  };

  const getSessionWidth = (startTime: string, endTime: string | null, duration: number | null) => {
    if (!endTime || !duration) return 2; // Minimum width for active sessions
    const durationHours = duration / 60;
    return (durationHours / 24) * 100; // Convert to percentage of day
  };

  if (!data?.sessions || data.sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">No sessions recorded this month.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(sessionsByDate)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, sessions]) => {
          const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
          const dateObj = new Date(date);

          return (
            <div key={date} className="timeline-row">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-slate-800">
                    {dateObj.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-800">
                  {formatDuration(totalDuration)}
                </div>
              </div>

              {/* Timeline Bar */}
              <div className="relative">
                {/* Background timeline (24 hours) */}
                <div className="h-8 bg-slate-100 rounded-lg relative overflow-hidden">
                  {/* Hour markers */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="flex-1 border-r border-slate-200 last:border-r-0"
                      />
                    ))}
                  </div>

                  {/* Work sessions */}
                  <div className="absolute inset-0 flex items-center">
                    {sessions.map((session, index) => {
                      const left = getSessionPosition(session.startAt);
                      const width = getSessionWidth(session.startAt, session.endAt, session.duration);
                      const colors = ['bg-accent', 'bg-primary', 'bg-warning', 'bg-secondary'];
                      const color = colors[index % colors.length];

                      return (
                        <div
                          key={session.id}
                          className={`absolute h-6 rounded flex items-center justify-center text-white text-xs font-medium ${color} ${session.isActive ? 'animate-pulse' : ''}`}
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 2)}%`,
                          }}
                        >
                          {session.duration ? formatDuration(session.duration) : 'Active'}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Time labels */}
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>12 AM</span>
                </div>
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
