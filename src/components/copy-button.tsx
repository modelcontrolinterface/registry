"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/use-clipboard";
import { Check, Copy, AlertTriangle } from "lucide-react";

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  textToCopy: string;
}

export function CopyButton({ textToCopy, className, ...props }: CopyButtonProps) {
  const { copy, copied, error } = useClipboard();

  const renderIcon = () => {
    if (error) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (copied) {
      return <Check className="h-4 w-4 text-primary" />;
    }
    return <Copy className="h-4 w-4" />;
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        error ? "text-destructive border-destructive hover:bg-destructive/10" : "",
        className
      )}
      {...props}
      onClick={() => copy(textToCopy)}
    >
      {renderIcon()}
    </Button>
  );
}
