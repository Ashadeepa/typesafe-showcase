export type TriageCategory = "billing" | "bug" | "feature" | "praise";

export interface TriageTicket {
  id: number;
  text: string;
}

// Not labeled here on purpose — the game asks Jev live, not a lookup table.
export const TRIAGE_TICKETS: TriageTicket[] = [
  { id: 1, text: "I was charged twice for my subscription this month." },
  { id: 2, text: "My invoice shows the wrong billing address." },
  { id: 3, text: "I cancelled my plan but you're still charging my card." },
  { id: 4, text: "Can I get a refund for the annual plan I didn't mean to buy?" },
  { id: 5, text: "Why did my card get charged before the free trial even ended?" },
  { id: 6, text: "The app crashes every time I upload a photo over 5MB." },
  { id: 7, text: "Login keeps failing with 'invalid session' right after I sign in." },
  { id: 8, text: "The mobile app is stuck on a loading spinner and never finishes." },
  { id: 9, text: "Search results are missing items that clearly match my query." },
  { id: 10, text: "Notifications stopped arriving even though they're enabled." },
  { id: 11, text: "Can you add dark mode? My eyes hurt using this at night." },
  { id: 12, text: "Please let us export reports as CSV, not just PDF." },
  { id: 13, text: "It would be great if we could assign tickets to teammates." },
  { id: 14, text: "Any chance of adding a keyboard shortcut for archiving?" },
  { id: 15, text: "Could you support two-factor login via an authenticator app?" },
  { id: 16, text: "Your support team was incredibly helpful yesterday, thank you!" },
  { id: 17, text: "Just wanted to say the new dashboard redesign looks great." },
  { id: 18, text: "This is the best tool our team has adopted all year." },
  { id: 19, text: "Whoever designed the onboarding flow deserves a raise." },
  { id: 20, text: "Quick migration, zero downtime — really smooth upgrade." },
];
