# Learning model

## Two independent signals

Automatic correctness answers: did the submitted response match the checked solution? A learner memory rating answers: how difficult was recall? These are persisted separately. The UI never maps “correct” automatically to “Good”.

Only reviewable knowledge facts use `ts-fsrs@5.4.2`. The adapter requests 0.9 retention, disables interval fuzz for repeatable tests, and otherwise uses the stable library defaults including short-term learning. Again/Hard/Good/Easy correspond to explicit ratings 1/2/3/4. The desired retention is a scheduler parameter, not a reported measured success rate.

Each ReviewEvent stores the linked attempt ID, rating, device UUID, UTC timestamp, scheduler version/retention, the before/after cards and complete serialized library review log. Dates are ISO UTC strings at the storage boundary. Cached ReviewState is derived from the newest event and reconstructed during backup import. Future scheduler upgrades require a version-aware replay/migration strategy.

Numeric and schematic application tasks log attempts but do not manufacture memory intervals. The default session selects up to five tasks: due facts first, previously incorrect work next, unseen tasks next, then previously correct work. Within each group the curated content order is stable. The separate review mode includes only scheduled due facts. Starting from the circuit library selects that circuit's two or three tasks, including component selection, calculations and a closed/open-contact thought experiment. Existing active sessions resume first, with an explanation if the selected circuit differs from the open session.

## Domain evaluation

Numeric input accepts decimal comma or dot, optional exponents and compatible SI units. The default unit is shown in the field label. Inputs normalize to A/V/Ω/W/Hz before absolute tolerance is applied. SI case is significant: mA is a milliampere; unknown or dimensionally wrong units are rejected without appending an attempt. Mixed decimal/thousands notation, empty input, fractions and non-finite values are rejected. Short recall uses curated normalized aliases; it is not a language-model grader.

The initial practice metric uses the last twenty attempts per concept. An answer counts as independently correct only if correct and no hint was used. The display is a transparent proportion with its sample count. No attempts means unknown, not zero proficiency. Topic summaries pool the assessed concept counts, so a multi-concept task contributes to each tagged concept. This metric is not a validated assessment and does not represent FSRS retention.

## Persistence

AttemptEvent includes a unique event/device/session ID, exercise/content version, UTC time, normalized and original answer, concepts, correctness, hint use and response duration. Attempts and reviews are immutable. Session progression, lesson completion, settings and cached review state are mutable local records. An attempt saves with the pending-step pointer in one transaction; reviewing and advancing happen in another transaction. A crash between them retains the answer for rating after reopening.

Hints are recorded. Retries are new practice occurrences rather than overwriting prior attempts. Self-ratings can differ from correctness; honest ratings are encouraged, but there is no forced “incorrect = Again” shortcut. Free-text answers stay local and are included in user-requested JSON backups.

References checked: [FSRS adapter API](https://open-spaced-repetition.github.io/ts-fsrs/), [Dexie React persistence](https://dexie.org/docs/Tutorial/React).
