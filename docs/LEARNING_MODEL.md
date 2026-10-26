# Learning model

## Two independent signals

Automatic correctness answers: did the submitted response match the checked solution? A learner memory rating answers: how difficult was recall? These are persisted separately. The UI never maps “correct” automatically to “Good”.

Only reviewable knowledge facts use `ts-fsrs@5.4.2`. The adapter requests 0.9 retention, disables interval fuzz for repeatable tests, and otherwise uses the stable library defaults including short-term learning. Again/Hard/Good/Easy correspond to explicit ratings 1/2/3/4. The desired retention is a scheduler parameter, not a reported measured success rate.

Each ReviewEvent stores the linked attempt ID, rating, device UUID, UTC timestamp, scheduler version/retention, the before/after cards and complete serialized library review log. Dates are ISO UTC strings at the storage boundary. Since v0.7, cached ReviewState is replayed from every supported immutable explicit rating during sync and backup import, rather than selected from the newest received card. Future scheduler upgrades require a version-aware replay/migration strategy.

Numeric and schematic application tasks log attempts but do not manufacture memory intervals. The separate review mode includes only scheduled due facts. Starting from the circuit library selects that circuit's two or three tasks, including component selection, calculations and a closed/open-contact thought experiment. Existing active sessions resume first; selecting another circuit or concept never replaces a pending answer.

## Explainable practice selection

`domain/practice-plan.ts` is a pure selection function shared by the preview and persisted session startup. It selects up to five unique tasks using recorded events, cached memory cards, read lessons and a supplied current time:

1. Due reviewable facts, earliest due first. Future scheduled facts are excluded from practice even after an incorrect answer; their next date remains controlled by the explicit FSRS rating.
2. Applications last answered incorrectly or with a hint, and unseen variations of concepts with an unassisted quote below 80%. Unseen variations come before repeated answers, then lower topic tiers and curated order. A recent application error still gets attention when its concept's aggregate quote is high.
3. Other unseen content, lower topic tiers first, then curated order.
4. Already independently solved applications, oldest last attempt first.

Unseen mixed content follows the recommended topic prerequisites: all lessons in each directly required topic must be marked as read. Reading is not treated as demonstrated competence. Previously attempted tasks and due facts stay accessible. Explicit topic/concept selections bypass this recommendation; all lessons remain freely accessible. A concept selection can include applications from several topics carrying that concept tag. An invalid or unavailable selection never clears existing data.

The practice screen shows each proposed exercise and its reason before starting. Starting rereads local data in the transaction and fixes that session's exercise IDs; later answers do not silently change an active queue. Recommendations link to `#/ueben?concept=…`, include real counts, and label fewer than three attempts as preliminary. The 80% threshold is a simple practice heuristic, not a validated proficiency cutoff. Repeated correct answers to one item can raise the quote; the UI never calls it proof of mastery.

## Domain evaluation

Numeric input accepts decimal comma or dot, optional exponents and compatible SI units. The default unit is shown in the field label. Inputs normalize to A/V/Ω/W/Hz before absolute tolerance is applied. SI case is significant: mA is a milliampere; unknown or dimensionally wrong units are rejected without appending an attempt. Mixed decimal/thousands notation, empty input, fractions and non-finite values are rejected.

Short recall uses explicit aliases with Unicode NFKC normalization, German case folding, collapsed whitespace and optional repeated final sentence punctuation. A word/symbol pair such as `Ohm (Ω)` is accepted only if both parts independently occur among that exercise's aliases. `Ohm (V)`, negation, alternatives and misspellings are not guessed. Existing grading events are never rewritten when normalization improves.

The practice metric and recommendations both use the last twenty attempts per concept. An answer counts as independently correct only if correct and no hint was used. The display is a transparent proportion with its sample count. No attempts means unknown, not zero proficiency. Topic summaries pool the assessed concept counts, so a multi-concept task contributes to each tagged concept. This metric is not a validated assessment and does not represent FSRS retention.

## Control learning

v0.5 adds the `controls` topic after recommended series/parallel foundations, three concept tags, the `control-basics-v1` lesson and ten version-1 exercises. The NC rest-state fact is reviewable; the nine applied symbol/prediction/diagnosis exercises are not. Correctness never supplies an FSRS rating. Circuit sessions select their exact two, three or four tasks. Prediction diagrams show the initial state and prompts state the input sequence explicitly.

The interactive laboratory is exploratory: input changes do not manufacture attempts or memory cards. Submitting a checked exercise records the same immutable AttemptEvent as before and feeds concept recommendations. Existing sessions resume before new control selections. The view's experiment resets when reopened, independently of persistent learning progress. Database and JSON schema 1 remain unchanged.

## Persistence

v0.6 adds twelve versioned diagnostic investigations (four per difficulty) and three supporting applications. Diagnostics are ordinary non-reviewable exercises in the planner and recommendations. Explicit submissions append the existing AttemptEvent format with versioned investigation JSON as the original answer and readable rubric feedback as the normalized answer. Replaying the trace independently of the UI derives measurements and checks the relevant control state. Location, causal mechanism and electrical evidence earn two points each; all six are needed for automatic correctness. Unsupported measurements are rejected; a correct guess is partial credit. Causal explanations are declared choices, not inferred free-text understanding.

Numbered database migration 2 adds investigation drafts. Inputs, measurements, inspections, hint use and selected answers survive navigation/reload before submission. Draft changes and free exploration are not learning attempts. Sticky hints remain separate from correctness; FSRS is unchanged. A prior active session/pending rating resumes before new cases. Completed investigations count in existing applied statistics, while a separate distinct-family count prevents repeated success at one position from increasing fault coverage. Level suggestions are transparent entry heuristics with learner override, not a proficiency estimate.

Backup version 2 adds drafts while accepting old version-1 backups. Old events/content IDs, generated DC versions, pending ratings and immutable-history semantics are preserved. Local drafts take precedence on import. See [full diagnostic rubric and compatibility](DIAGNOSTICS.md).

Generated DC rounds are explicit application practice with five fixed templates and a reproducible six-digit code. The user can choose a round independently of the recommended mix. Each task has an immutable versioned ID, complete worked solution and 0.1% relative tolerance in base units. Its attempt contributes to the same last-twenty concept evidence as curated tasks, while the dashboard counts curated-item discovery separately from calculation attempts. Reopening the same code repeats the same questions; it does not overwrite earlier attempts. No generated task is reviewable or updates FSRS. See [generated practice](GENERATED_PRACTICE.md).

AttemptEvent includes a unique event/device/session ID, exercise/content version, UTC time, normalized and original answer, concepts, correctness, hint use and response duration. Attempts and reviews are immutable. Session progression, completion projections, settings and cached review state are mutable local records. New lesson completions also append immutable protocol events. An attempt saves with the pending-step pointer in one transaction; reviewing and advancing happen in another transaction. A crash between them retains the answer for rating after reopening.

Hints are recorded. Retries are new practice occurrences rather than overwriting prior attempts. Self-ratings can differ from correctness; honest ratings are encouraged, but there is no forced “incorrect = Again” shortcut. Free-text answers stay local and are included in user-requested JSON backups.

References checked: [FSRS adapter API](https://open-spaced-repetition.github.io/ts-fsrs/), [Dexie React persistence](https://dexie.org/docs/Tutorial/React).

## Cross-device review reconciliation — v0.7

The shared schedule uses server acceptance sequence for acknowledged reviews and a provisional local timestamp/UUID tail. Every rating is replayed through the existing FSRS adapter from an empty card. Accepted event times are capped at receipt time and clamped against the previous replay time; slow clocks/late delivery can therefore change derived dates. Original ratings, timestamps, cards and logs remain unchanged. Equal supported event/receipt sets converge, while unknown scheduler revisions or reference/UUID conflicts stop sync visibly without deleting either source. This is an explicit ordering policy, not a reconstruction of actual human recall times.

Submitted attempts, reviews and lesson events synchronize; local active sessions, pending ratings, investigation drafts and preferences do not. Remote session descriptors make history reconstructable without inventing completed sessions or making another device's unfinished work resumable. Statistics continue to derive from original events; session completion counts refer only to actual local session records. The full replay and clock policy is in [SYNC_DESIGN.md](SYNC_DESIGN.md).

## Applied school learning — v0.8

Fifteen added topics extend the same prerequisite graph, concept evidence, planner, completion events and progress displays. All new lessons start unread. Six AC, five motor and four SPS theory units remain selectable without locks. The mixed plan uses prerequisites; targeted selection remains explicit.

Three added recall facts offer a separate memory rating. The other 72 curated additions and all generated rounds are application practice. Four structured response kinds persist only on explicit submission; visual exploration creates no attempts. Original and normalized submissions, hint use, duration, duplicate protection and pending feedback follow the original learning transaction. Unsubmitted controls are ephemeral. Physical phasor values and declared tolerances determine grading, independently of display pixels. See [school content and precise limits](SCHOOL_CURRICULUM.md).
