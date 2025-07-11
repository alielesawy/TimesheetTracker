import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Timer() {
  const { toast } = useToast();
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: timerStatus, isLoading } = useQuery({
    queryKey: ["/api/timer/status"],
    refetchInterval: 1000,
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timer/start");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timer/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheet"] });
      toast({
        title: "Timer started",
        description: "Your work session has begun.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start timer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timer/stop");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timer/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheet"] });
      setElapsedTime(0);
      toast({
        title: "Timer stopped",
        description: "Your work session has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to stop timer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (timerStatus?.isActive && timerStatus?.session) {
      const startTime = new Date(timerStatus.session.startAt);
      const updateElapsed = () => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);

      return () => clearInterval(interval);
    }
  }, [timerStatus]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startTimerMutation.mutate();
  };

  const handleStop = () => {
    stopTimerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!timerStatus?.isActive ? (
        /* Idle State */
        <div className="flex flex-col items-center">
          <Button
            onClick={handleStart}
            disabled={startTimerMutation.isPending}
            className="w-32 h-32 rounded-full bg-accent hover:bg-accent/90 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
            size="lg"
          >
            <div className="text-center">
              <Play className="h-8 w-8 mb-2 mx-auto" />
              <div className="text-sm font-medium">Start</div>
            </div>
          </Button>
        </div>
      ) : (
        /* Active State */
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            {/* Circular Progress Ring */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="351.86"
                strokeDashoffset="0"
                className="text-accent transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Timer Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={handleStop}
                disabled={stopTimerMutation.isPending}
                className="w-24 h-24 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                size="lg"
              >
                <div className="text-center">
                  <Square className="h-6 w-6 mb-1 mx-auto" />
                  <div className="text-xs font-medium">Stop</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Running Timer Display */}
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold text-slate-800">
              {formatTime(elapsedTime)}
            </div>
            <div className="text-slate-600 text-sm mt-1">Time elapsed</div>
          </div>
        </div>
      )}

      {/* Current Session Info */}
      {timerStatus?.isActive && timerStatus?.session && (
        <div className="mt-6 p-4 bg-slate-100 rounded-lg">
          <p className="text-sm text-slate-600">
            Started at{" "}
            <span className="font-medium text-slate-800">
              {new Date(timerStatus.session.startAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
