export interface Ticket {
  id: number;
  text: string;
}

// Same 16 sample tickets used in the Python demo (typesafe-jev-model-use-cases/data.py).
export const TICKETS: Ticket[] = [
  { id: 1, text: "I was charged twice for my subscription this month, please refund one." },
  { id: 2, text: "The app crashes every time I try to upload a photo larger than 5MB." },
  { id: 3, text: "Just wanted to say the new dashboard redesign looks great, nice work!" },
  { id: 4, text: "My invoice from last week shows the wrong billing address." },
  { id: 5, text: "Can you add dark mode? My eyes hurt using this at night." },
  { id: 6, text: "I cancelled my plan but you're still charging my card every month." },
  { id: 7, text: "Login keeps failing with 'invalid session' even right after I sign in." },
  { id: 8, text: "Where do I find my past payment receipts for tax purposes?" },
  { id: 9, text: "Feature request: let us export reports as CSV, not just PDF." },
  { id: 10, text: "Your support team was incredibly helpful yesterday, thank you!" },
  { id: 11, text: "I was billed for the annual plan when I only signed up for monthly." },
  { id: 12, text: "The mobile app is stuck on a loading spinner and never finishes." },
  { id: 13, text: "Please clarify: does the free trial auto-convert to a paid charge?" },
  { id: 14, text: "Search results are missing items that clearly match my query." },
  { id: 15, text: "I need a copy of last quarter's invoice for our accounting team." },
  { id: 16, text: "Notifications aren't arriving even though they're enabled in settings." },
];

// Below this, the model itself is torn between two of the three outcomes — flag for a human
// instead of trusting the top pick. See https://docs.typesafe.ai/confidence.md.
export const CONFIDENCE_THRESHOLD = 0.7;

export interface Claim {
  id: number;
  source: string;
  claim: string;
}

// Same policy docs + claims used in the Python demo (typesafe-jev-model-use-cases/citation_data.py).
export const SOURCES: Record<string, string> = {
  "refund-policy":
    "Refunds are issued within 5 business days to the original payment method. " +
    "Store credit is not offered for refunds requested after 30 days of purchase.",
  "shipping-policy":
    "Standard shipping takes 3-7 business days within the continental US. " +
    "International orders may take up to 21 days and are subject to customs fees paid by the recipient.",
  "warranty-policy":
    "All electronics carry a 1-year manufacturer warranty covering defects, but not accidental " +
    "damage or water damage. Extended warranties can be purchased separately within 30 days of purchase.",
};

export interface Note {
  id: number;
  text: string;
  context: string;
}

// Fun one: real-life passive-aggressive notes/messages, scored on an escalation rubric.
export const NOTES: Note[] = [
  { id: 1, context: "Slack DM to a teammate",
    text: "Hey! Just a friendly reminder that the dishes are in the sink. No worries, whenever you get a chance :)" },
  { id: 2, context: "Reply-all email",
    text: "Thanks so much for finally taking out the trash!! Really appreciate you stepping up." },
  { id: 3, context: "Performance review comment",
    text: "Great job on the report this quarter. Solid, clear work." },
  { id: 4, context: "Meeting follow-up email",
    text: "Per my last email, the meeting is at 3pm." },
  { id: 5, context: "Group chat after a mix-up",
    text: "Sure, I'll just redo the whole thing myself then, since apparently that's easier for everyone." },
  { id: 6, context: "Roommate note on the fridge",
    text: "I love how you always leave your dishes for ME to clean up. So thoughtful of you." },
  { id: 7, context: "Text to a friend",
    text: "Happy to help anytime you need, seriously!" },
  { id: 8, context: "Office kitchen sign",
    text: "Wow, must be nice to leave early every day while the rest of us stay late." },
  { id: 9, context: "Slack DM checking on a task",
    text: "Just checking in on the status of this — whenever you have a moment, no pressure!" },
  { id: 10, context: "Text after being left on read",
    text: "Oh, you're alive! Good to know, I guess." },
];

export const CLAIMS: Claim[] = [
  { id: 1, source: "refund-policy",
    claim: "Refunds are processed within 5 business days back to your original payment method." },
  { id: 2, source: "refund-policy",
    claim: "You can get a full refund at any time, no matter how long ago you bought it." },
  { id: 3, source: "refund-policy",
    claim: "If it's been over 30 days, we'll give you store credit instead of a refund." },
  { id: 4, source: "shipping-policy",
    claim: "Standard orders typically arrive within a week inside the continental US." },
  { id: 5, source: "shipping-policy",
    claim: "International shipping is always free, including customs fees." },
  { id: 6, source: "shipping-policy",
    claim: "We offer same-day delivery in select major cities." },
  { id: 7, source: "warranty-policy",
    claim: "Water damage isn't covered by the standard warranty, but you can buy an extended plan within a month of purchase." },
  { id: 8, source: "warranty-policy",
    claim: "The warranty covers accidental drops and cracked screens too." },
];
