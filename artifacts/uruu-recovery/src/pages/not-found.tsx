import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-destructive/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle className="h-8 w-8 text-destructive animate-pulse" />
            <h1 className="text-2xl font-bold text-foreground">404 Sector Missing</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground font-mono">
            The cryptographic sector you requested does not exist or has been collapsed into a different timeline.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
