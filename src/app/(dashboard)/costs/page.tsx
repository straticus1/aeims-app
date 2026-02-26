"use client";

import { Header } from "@/components/dashboard/header";
import { DollarSign, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CostsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Cost Management"
        subtitle="Track and optimize cloud spending"
        actions={
          <Button variant="outline">
            <TrendingDown className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Cost Analytics
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Monitor cloud costs across AWS, Oracle Cloud, and other providers with detailed breakdowns and forecasting.
          </p>
          <Button>
            <TrendingDown className="h-4 w-4 mr-2" />
            View Cost Breakdown
          </Button>
        </div>
      </div>
    </div>
  );
}
