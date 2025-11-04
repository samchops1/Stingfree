import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FABProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

export function FAB({ icon: Icon, label, onClick, className }: FABProps) {
  return (
    <Button
      size="icon"
      className={cn(
        "fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-xl z-40",
        "hover:scale-105 transition-transform",
        className
      )}
      onClick={onClick}
      data-testid="fab-button"
      aria-label={label}
    >
      <Icon className="w-6 h-6" />
    </Button>
  );
}
