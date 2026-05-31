"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import PhoneFrame from "@/components/PhoneFrame";
import PricePill from "@/components/PricePill";
import Button from "@/components/Button";
import { STRINGS } from "@/lib/coachStrings";

const FEATURES = [
  STRINGS.paywall_feature_chat,
  STRINGS.paywall_feature_pantry,
  STRINGS.paywall_feature_voice,
  STRINGS.paywall_feature_wearable,
];

// Plus paywall (spec §7.5). Tests whether the coach voice survives the moment
// the app acts in its own commercial interest. Annual is pre-selected.
export default function PaywallPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");

  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 overflow-y-auto">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="text-muted"
          >
            <X size={24} />
          </button>
        </div>

        <h1 className="mt-2 text-xl font-bold text-ink leading-tight">
          {STRINGS.paywall_headline_l1}
          <br />
          {STRINGS.paywall_headline_l2}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {STRINGS.paywall_sub_l1}
          <br />
          {STRINGS.paywall_sub_l2}
        </p>

        {/* Feature list */}
        <ul className="mt-8 flex flex-col gap-2">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-ink">
              <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        {/* Price boxes */}
        <div className="mt-8 flex gap-2 items-stretch">
          <PricePill
            label={STRINGS.paywall_price_monthly}
            amount={STRINGS.paywall_price_monthly_amount}
            unit={STRINGS.paywall_price_monthly_unit}
            selected={selected === "monthly"}
            onPress={() => setSelected("monthly")}
          />
          <PricePill
            label={STRINGS.paywall_price_annual}
            amount={STRINGS.paywall_price_annual_amount}
            unit={STRINGS.paywall_price_annual_unit}
            badge={STRINGS.paywall_annual_badge}
            selected={selected === "annual"}
            onPress={() => setSelected("annual")}
          />
        </div>

        <div className="mt-8">
          <Button
            variant="primary"
            label={STRINGS.paywall_cta}
            fullWidth
            onPress={() => router.push("/paywall/accepted")}
          />
        </div>
        <p className="mt-2 text-xs text-muted text-center">
          {STRINGS.paywall_disclaimer}
        </p>
      </main>
    </PhoneFrame>
  );
}
