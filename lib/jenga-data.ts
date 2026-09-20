export interface JengaSentence {
  id: string;
  label: string;
  text: string;
}

// Each one is padded with strippable modifiers (articles, adjectives, adverbs) wrapped around a
// clear actor / action / object, so there's a long safe stretch before the core starts to give.
export const SENTENCES: JengaSentence[] = [
  {
    id: "intern",
    label: "The intern",
    text: "The nervous intern quietly spilled hot coffee on the CEO's brand new white shirt",
  },
  {
    id: "cat",
    label: "The rescue",
    text: "Three exhausted firefighters carefully rescued a very frightened orange cat from the tall oak tree",
  },
  {
    id: "parrot",
    label: "The inheritance",
    text: "My eccentric aunt secretly left her entire fortune to a surprisingly ungrateful parrot named Winston",
  },
  {
    id: "critic",
    label: "The soup",
    text: "The young chef accidentally served an extremely spicy soup to the visiting French food critic",
  },
  {
    id: "spacewalk",
    label: "The repair",
    text: "Two tired astronauts slowly repaired the badly damaged solar panel during a very long spacewalk",
  },
];

export const COLLAPSE_THRESHOLD = 0.5;
