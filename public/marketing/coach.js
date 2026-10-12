export const lenses = {
  Action: {title:'What are they doing?', description:'Look for the steps a person takes toward an intention. Stay with their process.', glyph:'', question:'What is the person doing to move toward what matters to them?'},
  Thought: {title:'What is on their mind?', description:'Look for the weighing, reasoning, and deciding behind an action. Keep their uncertainty intact.', glyph:'', question:'What consideration is shaping their decision, in their own words?'},
  Feeling: {title:'How does it feel?', description:'Notice emotions they actually express. Let the quote tell you what they feel, without assuming.', glyph:'', question:'Which emotion is present in the quote, and what is it connected to?'},
  Philosophy: {title:'What matters to them?', description:'Listen for a belief or personal principle that reaches beyond this one situation.', glyph:'', question:'What belief or principle does the person express here?'}
};
const verbs = new Set('accept acknowledge adapt add adjust allow anticipate ask assess avoid balance believe build buy call care change check choose clarify collect compare consider cook decide describe discover discuss do doubt eat eliminate expect explore express feel figure find finish follow gather get give go help hesitate identify imagine keep know learn leave limit listen look make manage measure notice open organize plan prepare prioritize protect question read recognize reduce reflect remember resist review save search seek select sense share simplify spend start stop struggle support take talk think track trust try turn understand use value wait want weigh wonder work worry write'.split(' '));
export function inspectStatement(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const first = (words[0] || '').toLowerCase().replace(/[^a-z]/g,'');
  const verb = verbs.has(first);
  const solution = /\b(button|dashboard|notification|feature|dropdown|app|interface|widget|click|screen|tool)\b/i.test(text);
  const single = !/\b(and|also|then)\b|;/.test(text.toLowerCase()) && (text.match(/[.!?](?:\s|$)/g)||[]).length <= 1;
  const concise = words.length >= 3 && words.length <= 16;
  return {verb, solution, single, concise, words:words.length};
}
export function getFeedback(text,type){
  const check=inspectStatement(text);
  let strength = check.verb ? 'Your opening names an action or mental process directly.' : 'You have put an interpretation into words. Keep the original quote beside it as you revise.';
  let improvement = 'Check that every part of your interpretation is supported by the participant’s words.';
  let question = lenses[type].question;
  if(!check.verb){improvement='The opening may be a subject or description. A cognitive statement starts with the person’s action or mental process. This small local verb list can also miss valid verbs.';question='What is the person doing, considering, feeling, or believing here?';}
  else if(check.solution){improvement='This draft contains a possible interface or solution term. Look for the person’s underlying intention.';question='What is this person trying to work through, independent of a particular tool?';}
  else if(!check.single){improvement='There may be more than one idea in this draft. Keep the most important intention in focus.';question='If you kept only one thought from this draft, which one belongs with this quote?';}
  else if(!check.concise){improvement=check.words>16?'The draft is fairly long. Look for details you could remove while preserving the meaning.':'There may not yet be enough context to express the intention.';question='Which words carry the meaning, and which only describe the setting?';}
  return {check,strength,improvement,question};
}
