"use client";

import { Card, Button, Chip, Table } from "@heroui/react";
import React from "react";

export default function BillingPage() {
  const invoices = [
    { id: "INV-001", date: "Mar 15, 2026", amount: "$0.00", status: "Paid" },
    { id: "INV-002", date: "Feb 15, 2026", amount: "$0.00", status: "Paid" },
    { id: "INV-003", date: "Jan 15, 2026", amount: "$0.00", status: "Paid" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">Billing</h1>
        <p className="text-default-500">Manage your subscription, payment methods, and invoices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <Card className="lg:col-span-2 bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-divider">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Current Plan</span>
              <h2 className="text-4xl font-extrabold text-default-900">Free Tier</h2>
              <p className="text-default-500">Perfect for exploring and small experimental bots.</p>
            </div>
            <Button variant="primary" size="lg" className="font-bold shadow-lg shadow-primary/20">
              Upgrade to Pro
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-default-400 mb-2 uppercase">Agents Limit</span>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-default-900">3</span>
                <span className="text-sm text-default-400 mb-1">/ 5</span>
              </div>
              <div className="w-full h-1.5 bg-default-100 rounded-full mt-2 overflow-hidden">
                <div className="w-[60%] h-full bg-primary" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-default-400 mb-2 uppercase">Tasks / month</span>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-default-900">128</span>
                <span className="text-sm text-default-400 mb-1">/ 500</span>
              </div>
              <div className="w-full h-1.5 bg-default-100 rounded-full mt-2 overflow-hidden">
                <div className="w-[25%] h-full bg-success" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-default-400 mb-2 uppercase">Credits Balance</span>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-default-900">$10.00</span>
                <span className="text-sm text-default-400 mb-1">Trial</span>
              </div>
              <div className="w-full h-1.5 bg-default-100 rounded-full mt-2 overflow-hidden">
                <div className="w-[100%] h-full bg-accent" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-background/60 backdrop-blur-md border border-divider p-8 shadow-sm">
           <h3 className="text-xl font-bold text-default-900 mb-4">Payment Methods</h3>
           <p className="text-sm text-default-500 mb-6">No payment methods added yet.</p>
           <Button variant="secondary" className="w-full font-bold">Add Payment Method</Button>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-default-900 mb-4">Invoice History</h2>
        <Card className="bg-background/60 backdrop-blur-md border border-divider overflow-hidden">
          <Table aria-label="Recent invoices" className="min-w-full">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header>
                  <Table.Column>Invoice ID</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column>Amount</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column className="text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {invoices.map((invoice) => (
                    <Table.Row key={invoice.id}>
                      <Table.Cell className="font-mono text-xs">{invoice.id}</Table.Cell>
                      <Table.Cell>{invoice.date}</Table.Cell>
                      <Table.Cell>{invoice.amount}</Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color="success">Paid</Chip>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Button size="sm" variant="secondary">Download</Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card>
      </div>
    </div>
  );
}
