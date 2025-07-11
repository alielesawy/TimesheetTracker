import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Clock, Upload, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    emailNotifications: true,
    inAppNotifications: true,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    onSuccess: (data) => {
      setFormData({
        companyName: data.companyName || "",
        emailNotifications: data.emailNotifications || true,
        inAppNotifications: data.inAppNotifications || true,
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                onClick={() => setLocation(user?.isStaff ? "/admin" : "/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
                <p className="text-sm text-slate-600">Manage company branding and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Branding */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Company Branding</h3>
              <p className="text-slate-600 text-sm mt-1">
                Customize your company's appearance in the application
              </p>
            </div>

            <div className="space-y-6">
              {/* Company Name */}
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Company Logo */}
              <div>
                <Label>Company Logo</Label>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center">
                    <Clock className="text-white h-8 w-8" />
                  </div>
                  <div>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-sm text-slate-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        {user?.isStaff && (
          <Card>
            <CardContent className="p-6">
              <div className="border-b border-slate-200 pb-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Notification Settings</h3>
                <p className="text-slate-600 text-sm mt-1">
                  Configure how users receive notifications
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-800">Email Notifications</h4>
                    <p className="text-sm text-slate-600">Send email notifications for timesheet edits</p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, emailNotifications: checked })
                    }
                  />
                </div>

                {/* In-App Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-800">In-App Notifications</h4>
                    <p className="text-sm text-slate-600">Show notifications within the application</p>
                  </div>
                  <Switch
                    checked={formData.inAppNotifications}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, inAppNotifications: checked })
                    }
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={updateSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
