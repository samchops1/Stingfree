import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopAppBarProps {
  title: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  className?: string;
}

export function TopAppBar({ 
  title, 
  notificationCount = 0, 
  onNotificationClick,
  className 
}: TopAppBarProps) {
  return (
    <header 
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border",
        className
      )}
      data-testid="top-app-bar"
    >
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold truncate" data-testid="app-bar-title">
          {title}
        </h1>
        
        {onNotificationClick && (
          <Button
            variant="ghost"
            size="icon"
            className="relative flex-shrink-0"
            onClick={onNotificationClick}
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]"
                variant="destructive"
                data-testid="notification-count"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
