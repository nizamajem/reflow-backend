import { UserTier } from "@/common/enums/user-tier.enum";

type DefaultPackage = {
  id: string;
  name: string;
  durationLabel: string;
  description: string;
  benefits: string[];
  basePrice: Record<UserTier, number>;
};

export const DEFAULT_PACKAGES: DefaultPackage[] = [
  {
    id: "pkg-starter",
    name: "Starter Package (Minimum Balance)",
    durationLabel: "Starter",
    description: "Ensure every rider keeps the minimum balance required to access Reflow services.",
    benefits: ["Instant activation", "Balance monitoring", "Priority support"],
    basePrice: {
      student: 50000,
      public: 50000,
    },
  },
  {
    id: "pkg-1h",
    name: "1 Hour Package",
    durationLabel: "1 Hour",
    description: "Perfect for quick rides or trial sessions with limited time commitment.",
    benefits: ["1-hour riding quota", "Standard support"],
    basePrice: {
      student: 7000,
      public: 7000,
    },
  },
  {
    id: "pkg-2h",
    name: "2 Hour Package",
    durationLabel: "2 Hours",
    description: "Extended riding time for shift coverage or planned itineraries.",
    benefits: ["2-hour riding quota", "Extended support window"],
    basePrice: {
      student: 10000,
      public: 10000,
    },
  },
];
