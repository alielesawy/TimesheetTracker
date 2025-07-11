import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SessionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

export function SessionEditModal({ isOpen, onClose, session }: SessionEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
  });

  useEffect(() => {
    if (session) {
      const startDate = new Date(session.startAt);
      const endDate = session.endAt ? new Date(session.endAt) : null;

      setFormData({
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate ? endDate.toTimeString().slice(0, 5) : "",
      });
    }
  }, [session]);

  const updateSessionMutation = useMutation({
    mutationFn: async (data) => {
      if (session.id) {
        // Update existing session
        const res = await apiRequest("PUT", `/api/admin/session/${session.id}`, data);
        return await res.json();
      } else {
        // Create new session
        const res = await apiRequest("POST", `/api/admin/session`, data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user"] });
      toast({
        title: session.id ? "Session updated" : "Session created",
        description: session.id 
          ? "The session has been updated successfully." 
          : "The session has been created successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: session.id ? "Update failed" : "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast({
        title: "Invalid input",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const startAt = new Date(`${formData.date}T${formData.startTime}`);
    const endAt = new Date(`${formData.date}T${formData.endTime}`);

    if (endAt <= startAt) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    const duration = Math.floor((endAt.getTime() - startAt.getTime()) / 60000);

    const sessionData = {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      duration,
      isActive: false,
    };

    // If creating new session, add required fields
    if (!session.id) {
      sessionData.userId = session.userId;
      sessionData.timesheetId = session.timesheetId;
    }

    updateSessionMutation.mutate(sessionData);
  };

  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return "0h 0m";

    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);

    if (end <= start) return "0h 0m";

    const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{session?.id ? "Edit Session" : "Add Session"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="session-date">Date</Label>
            <Input
              id="session-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-sm text-slate-600">
              <span className="font-medium">Duration:</span> {calculateDuration()}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateSessionMutation.isPending}>
              {session?.id ? "Save Changes" : "Create Session"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
