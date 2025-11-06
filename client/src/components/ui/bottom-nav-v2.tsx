import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  activeIcon: LucideIcon;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNavV2({ items }: BottomNavProps) {
  const [location] = useLocation();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-t border-border/50"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
      data-testid="bottom-navigation"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-around h-16 px-2">
        {items.map((item, index) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative flex-1"
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Active Background Glow */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  >
                    <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl" />
                  </motion.div>
                )}

                {/* Icon with Animation */}
                <motion.div
                  animate={isActive ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut"
                  }}
                >
                  <Icon className={cn(
                    "w-6 h-6 transition-all",
                    isActive && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                  )} />
                </motion.div>

                {/* Label */}
                <span className={cn(
                  "text-xs transition-all",
                  isActive ? "font-semibold scale-105" : "font-medium"
                )}>
                  {item.label}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
