"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface Props {
  message: string;
  disabled?: boolean;
  className?: string;
}

export function OpenChatButton({ message, disabled, className }: Props) {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("open-chat-widget", { detail: { message } })
    );
  };

  return (
    <Button
      variant="outline"
      className={`w-full gap-2 ${className ?? ""}`}
      disabled={disabled}
      onClick={handleClick}
    >
      <MessageSquare className="h-4 w-4" />
      Book via AI Chat
    </Button>
  );
}
