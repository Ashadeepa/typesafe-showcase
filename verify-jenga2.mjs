import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();
const ORIGINAL = "The nervous intern quietly spilled hot coffee on the CEO's brand new white shirt.";

function buildSentence(words) {
  const j = words.join(" ");
  return j.charAt(0).toUpperCase() + j.slice(1) + ".";
}

function pickQuestion(words) {
  const criteria = {};
  words.forEach((w, i) => {
    criteria[`w${i}`] = `Remove the word “${w}” (position ${i + 1}).`;
  });
  return choice(
    "You are playing a word-removal game. After removing one word, the sentence must still mean " +
      "the same thing as `original_meaning`. Which single word is the SAFEST to remove — the one " +
      "whose removal damages the core meaning least?",
    criteria,
  );
}

// Play a greedy solo game: Jev keeps picking its safest word.
let words = ORIGINAL.replace(/[.!?]+$/, "").split(/\s+/);
console.log(`start: ${buildSentence(words)}\n`);

for (let turn = 0; turn < 10 && words.length > 2; turn++) {
  const r = await client.systemOne({
    state: { sentence: buildSentence(words), original_meaning: ORIGINAL },
    questions: { pick: pickQuestion(words) },
  });
  const a = r.answers.pick;
  const idx = Number(a.choice.slice(1));
  const word = words[idx];
  if (word === undefined) {
    console.log(`INVALID pick: ${a.choice}`);
    break;
  }
  words = words.filter((_, i) => i !== idx);
  console.log(
    `turn ${turn + 1}: pulled “${word}” (conf ${a.confidence.toFixed(2)}) -> ${buildSentence(words)}`,
  );
}
