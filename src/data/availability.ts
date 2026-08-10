import type { AvailabilityOption } from "../types";

export const availabilityOptions: AvailabilityOption[] = [
  {
    id: "weekday",
    label: "Most weekdays",
    detail: "Flexible daytime availability",
    note: "Best for recruiter introductions and technical conversations.",
  },
  {
    id: "evening",
    label: "Weekday evenings",
    detail: "Available by request",
    note: "Useful when daytime schedules do not align.",
  },
  {
    id: "weekend",
    label: "Most weekends",
    detail: "Flexible scheduling",
    note: "Available for longer portfolio or project discussions.",
  },
];

export const candidateProfile = {
  location: "Flushing, New York City",
  status: "Currently open to work",
  preferredRole: "Software engineering",
  availabilitySummary: "Mostly available throughout the week",
} as const;
