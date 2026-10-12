# Quick tour and promotional video

## Interaction

Use one small coachmark attached to the control being explained. A speech-bubble pointer meets a single 1 px light-gray outline around the target; the rest of the page is lightly dimmed but remains usable. Name the target in the card heading and show one or two sentences. An accessible back icon, Next, and a close icon remain available. The first card appears beside **Interviews** in the left navigation.

Each card enters from its target over 320 ms; the target outline gives one faint light-gray pulse. Six progress dots are the only visible step indicator. The top toolbar keeps a fixed back slot at the left and sound and close controls at the right. The target heading and body share one left alignment below the toolbar. A separated footer places progress dots at the left and Next at the right. All utility icons are borderless at rest, on hover, and when pressed; hover and press use a subtle gray fill, while keyboard focus uses a dark fill for visibility. Motion runs only when a step becomes ready, not on every scroll or resize. Respect the system’s reduced-motion preference.

Next uses the Particle Button interaction from the user's KokonutUI reference: six tiny grayscale particles scatter upward once when the pointer enters the button. Keeping the pointer still does not loop the effect; leaving and re-entering replays it. Keyboard focus gives the same visual cue. Hover never plays sound or changes steps. Clicking Next or Done advances immediately, with a quick scale press and a small bounce of the newly active progress dot. There is no animation wait or temporary button lock. Each particle lasts 600 ms with staggered starts; the full burst finishes within 900 ms. The particle layer lives outside the coachmark so an existing burst can finish if the card changes. The effect works with sound muted. Reduced motion disables the bounce and particles and preserves the pressed background change. Touch users can advance immediately without needing hover.

Audio matches the approved standalone card preview. Next is a crisp jelly impact with a lighter low-frequency body, a brief bright onset, and a small rebound, finishing within 180 ms. Back is a single light tone. Done rises through three short notes over roughly 330 ms. The close icon and Escape play a short ending tone; closing interrupts any unfinished sequence. The increased playback level is retained, with bounded gain and a soft onset on every voice. Sound is triggered only by actions, never by loading, hovering, scrolling, or repeated animations, and never delays navigation. The speaker button remembers the browser preference. Rapid Next clicks are rate-limited; Close and Done take priority. All audio is synthesized locally and works in the offline demo. The card and pointer use the approved pale border and subtle shadow.

The tour is designed for about one minute, with six stops and a prepared fictional example. Users may edit the example, but no assignment blocks the next step. It can be closed and resumed. The previous long instructions, chapter navigation, and completion requirements have been removed.

| Stop | Highlight | Message |
| --- | --- | --- |
| 1 | Interviews in the sidebar | Paste a transcript, select a passage, and save a quote. |
| 2 | A saved quote | Keep the source, then explore its intention. |
| 3 | Statement editor | Choose a lens, write one intention, use coach feedback, and complete the six checks. |
| 4 | A tower in the mental model | Group shared intentions, then organize related towers into spaces. |
| 5 | Support opportunities | Explore how to help while staying connected to the human intention. |
| 6 | Practice coach in the sidebar | Try a statement review and revisit Coaching history. Distinguish scripted practice from ChatGPT coaching in a real project. |

Use the existing grayscale palette and plain typography. The card and its pointer move with the target when scrolling or resizing. Choosing a sidebar destination during the tour opens that destination’s card; the current map step is preserved when staying on the map. On the map, the tower spotlight follows the actual statement cards, tower title, and Edit tower button, ending just below the button; it excludes the title container’s bottom padding and divider, the support section, and empty flex space above the cards. The support spotlight follows only its label text and input, excluding the container’s top and bottom padding. Resizing or expanding this content updates its highlight bounds. On narrow screens, place it directly above or below the target when possible; for tall editors, highlight the visible portion beside the card. Hide the pointer when the target scrolls out of view and offer Show me where. Use a light spotlight treatment, without decorative arrows or extra tutorial copy.

## 60-second promotional cut

Follow the same fictional dinner case and the same screen order. The video can use the tour cards as brief explanations, with close-ups of the highlighted controls.

| Time | Shot | Suggested narration |
| --- | --- | --- |
| 0–10 sec | Interviews highlights; select a passage from the sample | “Start with a conversation. Keep the words that reveal what matters to someone.” |
| 10–20 sec | Open the saved quote and choose Write a statement | “Move from their words toward an interpretation, while keeping the original source close.” |
| 20–36 sec | Edit the statement; show brief close-ups of feedback and the six checks | “Name one intention. Use coaching to look again, then review your interpretation before it joins the model.” |
| 36–47 sec | Reveal the mental space and tower | “Group shared intentions. Make room for patterns across interviews.” |
| 47–52 sec | Highlight support below the tower | “Explore where you could help, grounded in what people are trying to do.” |
| 52–57 sec | Open Practice coach and show Coaching history | “Try coaching, then return to the feedback as your thinking develops.” |
| 57–60 sec | Show the finish screen and Create a project | “From their words to a clearer understanding.” |

The example is already populated. Keep its scripted-feedback label visible and show edits as the researcher's actions. A live ChatGPT round trip should only be shown after it has been connected and verified for the recording account.

## Recording

Restart the tour for a clean example. Capture each coachmark appearing beside its target, pause long enough to read it, then use Next. Capture optional close-ups of selecting a quote, editing a statement, moving a card, and adding support. Keep this case consistent from the first interview to the final map.
