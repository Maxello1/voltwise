# Learning model

## Two independent signals

Automatic correctness answers: did the submitted response match the checked solution? A learner memory rating answers: how difficult was recall? These are persisted separately. The UI never maps “correct” automatically to “Good”.

Only reviewable knowledge facts use `ts-fsrs@5.4.2`. The adapter requests 0.9 retention, disables interval fuzz for repeatable tests, and otherwise uses the stable library defaults including short-term learning. Again/Hard/Good/Easy correspond to explicit ratings 1/2/3/4. The desired retention is a scheduler parameter, not a reported measured success rate.

Each ReviewEvent stores the linked attempt ID, rating, device UUID, UTC timestamp, scheduler version/retention, the before/after cards and complete serialized library review log. Dates are ISO UTC strings at the storage boundary. Cached ReviewState is derived from the newest event and reconstructed during backup import. Future scheduler upgrades require a version-aware replay/migration strategy.

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

## Persistence

Generated DC rounds are explicit application practice with five fixed templates and a reproducible six-digit code. The user can choose a round independently of the recommended mix. Each task has an immutable versioned ID, complete worked solution and 0.1% relative tolerance in base units. Its attempt contributes to the same last-twenty concept evidence as curated tasks, while the dashboard counts curated-item discovery separately from calculation attempts. Reopening the same code repeats the same questions; it does not overwrite earlier attempts. No generated task is reviewable or updates FSRS. See [generated practice](GENERATED_PRACTICE.md).

AttemptEvent includes a unique event/device/session ID, exercise/content version, UTC time, normalized and original answer, concepts, correctness, hint use and response duration. Attempts and reviews are immutable. Session progression, lesson completion, settings and cached review state are mutable local records. An attempt saves with the pending-step pointer in one transaction; reviewing and advancing happen in another transaction. A crash between them retains the answer for rating after reopening.

Hints are recorded. Retries are new practice occurrences rather than overwriting prior attempts. Self-ratings can differ from correctness; honest ratings are encouraged, but there is no forced “incorrect = Again” shortcut. Free-text answers stay local and are included in user-requested JSON backups.

References checked: [FSRS adapter API](https://open-spaced-repetition.github.io/ts-fsrs/), [Dexie React persistence](https://dexie.org/docs/Tutorial/React).
