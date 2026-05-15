"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface Tab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabPanelProps {
  tabs: Tab[];
  defaultValue?: string;
}

export function TabPanel({ tabs, defaultValue }: TabPanelProps) {
  return (
    <Tabs defaultValue={defaultValue ?? tabs[0]?.value}>
      <TabsList className="mb-6">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
