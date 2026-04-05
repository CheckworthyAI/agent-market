"use client";

import { Card, Button, TextField, InputGroup, Label } from "@heroui/react";
import React, { useState } from "react";

export default function HelpFeedbackPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "general",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setFormData({ subject: "", category: "general", message: "" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">Help & Feedback</h1>
        <p className="text-default-500">Need help or want to share feedback? We'd love to hear from you.</p>
      </div>

      {showSuccess && (
        <Card className="fixed top-24 right-8 z-[203] bg-surface border border-divider p-4 shadow-[var(--overlay-shadow)] w-auto max-w-xs">
          <div className="flex gap-3 items-center">
            <div className="bg-success text-success-foreground rounded-full p-1 shrink-0">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <polyline points="20 6 9 17 4 12"></polyline>
               </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-foreground text-sm">Message Sent</p>
              <p className="text-xs text-muted-foreground">Thank you for your feedback!</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Contact Form */}
        <Card className="bg-surface border border-divider p-8">
          <h2 className="text-xl font-bold text-default-900 mb-6">Send us a message</h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <TextField>
              <Label>Subject</Label>
              <InputGroup>
                <InputGroup.Input 
                  placeholder="What is this regarding?"
                  value={formData.subject} 
                  onChange={(e: any) => setFormData({ ...formData, subject: e.target.value })} 
                  required
                />
              </InputGroup>
            </TextField>
            
            <TextField>
              <Label>Category</Label>
              <InputGroup>
                <select 
                  className="w-full bg-transparent border-none appearance-none outline-none focus:ring-0 px-3 py-2 text-default-900"
                  value={formData.category} 
                  onChange={(e: any) => setFormData({ ...formData, category: e.target.value })} 
                >
                  <option className="bg-white dark:bg-zinc-900" value="general">General Inquiry</option>
                  <option className="bg-white dark:bg-zinc-900" value="bug">Report a Bug</option>
                  <option className="bg-white dark:bg-zinc-900" value="feature">Feature Request</option>
                  <option className="bg-white dark:bg-zinc-900" value="billing">Billing Issue</option>
                </select>
              </InputGroup>
            </TextField>

            <TextField>
              <Label>Message</Label>
              <InputGroup>
                <textarea 
                  className="w-full bg-transparent border-none outline-none focus:ring-0 px-3 py-2 min-h-[120px] resize-y text-default-900"
                  placeholder="Please provide details..."
                  value={formData.message} 
                  onChange={(e: any) => setFormData({ ...formData, message: e.target.value })} 
                  required
                />
              </InputGroup>
            </TextField>

            <Button 
              type="submit"
              variant="primary"
              className="mt-2 font-bold w-full md:w-auto px-8 self-start"
            >
              Submit Feedback
            </Button>
          </form>
        </Card>

        {/* FAQ or Quick Links */}
        <div className="flex flex-col gap-6">
          <Card className="bg-surface border border-divider p-8">
            <h2 className="text-xl font-bold text-default-900 mb-4">Documentation</h2>
            <p className="text-sm text-default-500 mb-4">
              Check out our comprehensive documentation to learn more about setting up and using AI agents.
            </p>
            <Button variant="outline" className="w-fit">
              View Documentation
            </Button>
          </Card>

          <Card className="bg-surface border border-divider p-8">
            <h2 className="text-xl font-bold text-default-900 mb-4">Community</h2>
            <p className="text-sm text-default-500 mb-4">
              Join our community to connect with other developers, share ideas, and get faster community answers.
            </p>
            <div className="flex gap-4">
              <Button variant="secondary">
                Join Discord
              </Button>
              <Button variant="outline">
                GitHub 
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
