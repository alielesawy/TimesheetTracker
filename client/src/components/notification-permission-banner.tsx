import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

export function NotificationPermissionBanner() {
  const { permission, requestPermission } = useNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if permission is already granted or dismissed
  if (permission === "granted" || permission === "denied" || isDismissed) {
    return null;
  }

  const handleRequest = async () => {
    await requestPermission();
    setIsDismissed(true);
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-slate-800">Enable Browser Notifications</h4>
              <p className="text-sm text-slate-600">
                Get notified about timer updates and important messages from admins.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={handleRequest}>
              Enable
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}