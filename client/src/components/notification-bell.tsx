import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
// --- START: استيراد أيقونات جديدة ---
import { Bell, Edit, PlusCircle, Trash2 } from "lucide-react";
// --- END: استيراد أيقونات جديدة ---
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useNotifications } from "@/hooks/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- START: مكون جديد لعرض الأيقونة المناسبة ---
const NotificationIcon = ({ title }: { title: string }) => {
  if (title.includes("Updated")) {
    return (
      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
        <Edit className="text-amber-600 h-4 w-4" />
      </div>
    );
  }
  if (title.includes("Added")) {
    return (
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <PlusCircle className="text-blue-600 h-4 w-4" />
      </div>
    );
  }
  if (title.includes("Deleted")) {
    return (
      <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
        <Trash2 className="text-red-600 h-4 w-4" />
      </div>
    );
  }
  // Default icon
  return (
    <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
      <Bell className="text-slate-600 h-4 w-4" />
    </div>
  );
};
// --- END: مكون جديد لعرض الأيقونة المناسبة ---


export function NotificationBell() {
  const { showNotification } = useNotifications();
  const previousNotificationsRef = useRef<any[]>([]);
  
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (notifications.length > 0 && previousNotificationsRef.current.length > 0) {
      const newNotifications = notifications.filter(notification => 
        !previousNotificationsRef.current.some(prev => prev.id === notification.id)
      );
      
      newNotifications.forEach(notification => {
        showNotification(notification.title, notification.message);
      });
    }
    previousNotificationsRef.current = notifications;
  }, [notifications, showNotification]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: number) => {
    if (markAsReadMutation.isPending) return;
    markAsReadMutation.mutate(id);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-slate-800">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              You have no new notifications.
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex items-start space-x-3 p-3 cursor-pointer hover:bg-slate-50 data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                disabled={notification.isRead}
              >
                {/* --- START: استخدام المكون الجديد لعرض الأيقونة --- */}
                <NotificationIcon title={notification.title} />
                {/* --- END: استخدام المكون الجديد لعرض الأيقونة --- */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1.5"></div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}