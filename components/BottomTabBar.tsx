import Link from "next/link";
import { Calendar, ShoppingBasket, MessageCircle, Compass } from "lucide-react";
import { STRINGS } from "@/lib/coachStrings";

type TabKey = "plan" | "list" | "coach" | "discover";

interface BottomTabBarProps {
  active: TabKey;
}

const TABS: { key: TabKey; href: string; label: string; Icon: typeof Calendar }[] = [
  { key: "plan", href: "/plan", label: STRINGS.home_tab_plan, Icon: Calendar },
  { key: "list", href: "/list", label: STRINGS.home_tab_list, Icon: ShoppingBasket },
  { key: "coach", href: "/coach", label: STRINGS.home_tab_coach, Icon: MessageCircle },
  { key: "discover", href: "/discover", label: STRINGS.home_tab_discover, Icon: Compass },
];

// Bottom-tab navigation modeled on iOS (spec §4). Fixed to the bottom of the
// phone frame, 4 equal-width tabs, 56px tall. Active = ink + filled icon;
// inactive = muted + outline.
export default function BottomTabBar({ active }: BottomTabBarProps) {
  return (
    <nav className="border-t border-hairline bg-card flex shrink-0" aria-label="Primary">
      {TABS.map(({ key, href, label, Icon }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 h-14 flex flex-col items-center justify-center gap-1 ${
              isActive ? "text-ink" : "text-muted"
            }`}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.25 : 1.75}
              fill={isActive ? "currentColor" : "none"}
              fillOpacity={isActive ? 0.12 : 0}
            />
            <span className="text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export type { BottomTabBarProps, TabKey };
