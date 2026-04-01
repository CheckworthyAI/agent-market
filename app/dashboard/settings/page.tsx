"use client";

import { Card, Button, Input, TextField, InputGroup, Separator, Chip, Switch, Label, Alert } from "@heroui/react";
import React, { useState } from "react";

const TABS = ["Profile", "Account", "Notifications", "Security", "Team", "API Keys"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "John Doe",
    bio: "AI Enthusiast and Automation Expert."
  });

  const handleUpdate = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const [preferences, setPreferences] = useState({
    email: true,
    desktop: true
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete your account? This action is permanent.")) {
      alert("Account deletion initiated. You will be logged out.");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Profile":
        return (
          <div className="flex flex-col gap-6">
            <Card className="bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm">
              <h2 className="text-xl font-bold text-default-900 mb-6">Profile Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField>
                  <Label>Display Name</Label>
                  <InputGroup>
                    <InputGroup.Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </InputGroup>
                </TextField>

                <TextField>
                  <Label>Email Address</Label>
                  <InputGroup>
                    <InputGroup.Input defaultValue="john.doe@example.com" disabled />
                  </InputGroup>
                </TextField>

                <div className="md:col-span-2">
                  <TextField>
                    <Label>Bio</Label>
                    <InputGroup>
                       <InputGroup.Input 
                         value={formData.bio} 
                         onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                       />
                    </InputGroup>
                  </TextField>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="mt-8 font-bold w-full md:w-auto px-8"
                onPress={handleUpdate}
              >
                Update Profile
              </Button>
            </Card>

            <Card className="bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm">
              <h2 className="text-xl font-bold text-default-900 mb-6">Preferences</h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                     <p className="font-bold text-default-900">Email Notifications</p>
                     <p className="text-sm text-default-500">Receive alerts when agents perform significant tasks.</p>
                  </div>
                  <Switch 
                    isSelected={preferences.email} 
                    onChange={(e: any) => setPreferences({ ...preferences, email: e.target.checked })} 
                  />
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                     <p className="font-bold text-default-900">Desktop Alerts</p>
                     <p className="text-sm text-default-500">Show desktop notifications for real-time status updates.</p>
                  </div>
                  <Switch 
                    isSelected={preferences.desktop} 
                    onChange={(e: any) => setPreferences({ ...preferences, desktop: e.target.checked })} 
                  />
                </div>
              </div>
            </Card>
          </div>
        );
      case "Account":
        return (
          <Card className="bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm">
             <h2 className="text-xl font-bold text-default-900 mb-4">Account Settings</h2>
             <p className="text-default-500 italic">Account management features coming soon...</p>
          </Card>
        );
      default:
        return (
          <Card className="bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm">
             <h2 className="text-xl font-bold text-default-900 mb-4">{activeTab}</h2>
             <p className="text-default-500 italic">{activeTab} configuration features coming soon...</p>
          </Card>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">Settings</h1>
        <p className="text-default-500">Manage your profile, account preferences, and application settings.</p>
      </div>

      {showSuccess && (
        <Card className="fixed top-24 right-8 z-[203] bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-500/30 p-4 shadow-xl animate-in fade-in slide-in-from-right-4 w-auto max-w-xs">
          <div className="flex gap-3 items-center">
            <div className="bg-success text-white rounded-full p-1 shrink-0">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <polyline points="20 6 9 17 4 12"></polyline>
               </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-success-700 dark:text-success-400 text-sm">Updated Successfully</p>
              <p className="text-xs text-success-600 dark:text-success-500/80">Your changes have been saved.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
        <div className="lg:col-span-1 flex flex-col gap-2">
           {TABS.map((tab) => (
             <Button 
               key={tab} 
               variant={tab === activeTab ? "primary" : "secondary"} 
               className="justify-start font-bold transition-all"
               onPress={() => setActiveTab(tab)}
             >
               {tab}
             </Button>
           ))}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          {renderTabContent()}

          <Card className="bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm border-danger/20">
            <h2 className="text-xl font-bold text-danger mb-4 font-mono uppercase tracking-tighter">Danger Zone</h2>
            <p className="text-sm text-default-500 mb-6">Permanently delete your account and all associated agent data.</p>
            <Button 
              variant="secondary" 
              className="text-danger hover:bg-danger/10 border-danger/20 font-bold transition-colors"
              onPress={handleDelete}
            >
               Delete Account
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
