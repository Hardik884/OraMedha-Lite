OraMedha PG — End-to-End User Journey v0.1

1. New patient enters

PG taps:

+ Add Patient

Minimum fields:

- Name
- Phone number
- Tooth number
- Procedure / case type
- Optional OPD number

Keep this under 30 seconds.

Then OraMedha asks:

What stage is this case at?

Example for Primary RCT:

- Access opening
- BMP
- Obturation
- Other

---

2. First appointment is created

PG can either:

- manually choose a slot, or
- let OraMedha suggest a slot based on availability and procedure duration.

Initially, default mode should be:

Suggest → PG confirms

Later user can switch to:

Auto-schedule

Once confirmed:

- appointment enters calendar
- patient receives WhatsApp confirmation
- reminder is scheduled

---

3. Day starts

PG opens Today.

Sees:

Today

8 patients

For each:

- Time
- Patient
- Tooth
- Procedure / current stage
- Confirmation status

Example:

10:00 — Rahul
46 · Primary RCT · BMP
Confirmed

Pending

Only things that need action:

- 2 unconfirmed
- 1 missed yesterday
- 1 patient needs scheduling

No unnecessary analytics.

---

4. Patient arrives

PG opens the patient.

The Patient/Case screen immediately shows:

- Name
- Phone
- Tooth
- Case type
- Current stage
- Next planned step
- Appointment
- Case history
- Files

The PG should understand the complete case state within seconds.

---

5. During / after treatment

After the clinical work, PG taps:

Update Visit

OraMedha asks:

What did you work on?

Example:
Access opening

Status?

- Partial
- Complete

If Partial:

«Next likely action: Continue access opening»

If Complete:

«Next likely action: BMP»

The same logic applies to:

- GP removal
- BMP
- Post-space preparation
- etc.

---

6. OraMedha determines what happens next

The engine looks at:

Case family
+
Current stage
+
Partial/complete
+
Any modifier
+
PG defaults

Example:

Retreatment
→ GP removal complete
→ infection present
→ calcium hydroxide placed

OraMedha then knows that the next visit depends on the medicament rule configured for that PG.

---

7. Next appointment is automatically proposed

OraMedha calculates:

- appropriate next-visit window
- expected duration
- PG availability
- existing bookings
- blocked periods

Then proposes:

«Next appointment: Tuesday, 11:00 AM
Duration: 60 min
Next step: Obturation»

PG gets:

Confirm
Change slot
Change next step

Later, in Auto mode, routine cases can be booked automatically within defined rules.

---

8. Patient communication happens automatically

Once booked:

WhatsApp goes to patient.

Example:

«Your next dental appointment is scheduled for Tuesday at 11:00 AM.»

Patient can:

- Confirm
- Reschedule
- Request call

If Reschedule:

OraMedha offers only PG-approved alternatives.

If no response:

- one reminder
- then status becomes Unconfirmed

---

9. Appointment reminder

Before the visit:

Automatic WhatsApp reminder.

Timing configurable by PG.

Example:

- previous evening
- 2 hours before
- both if desired

---

10. If patient cancels or doesn't show

Cancellation

Slot becomes free automatically.

Patient becomes:

Reschedule pending

No-show

OraMedha marks:

Missed

Then:

- sends/reserves rescheduling workflow
- surfaces patient in Pending

Later intelligence may suggest another patient who can fill the free slot.

Not required in v0.1.

---

11. Files are captured as the case progresses

At any visit:

PG can tap:

Add File

Attach:

- X-ray
- clinical photo
- microscope image
- PDF
- PPT
- report

Files remain attached to the specific patient/case.

Ideally they are also tied to the treatment stage.

Example:

Case timeline

Access opening

- clinical photo

Working length

- WL X-ray

BMP

- microscope photo

Obturation

- post-op X-ray

This makes retrieval much easier than searching the phone gallery or laptop.

---

12. Clinical work automatically creates progress data

Every completed stage/procedure updates:

- case history
- procedure counts
- special-case counts
- logbook record

The PG should never re-enter information that OraMedha already knows.

Example:

Obturation completed

automatically contributes to:

«Primary RCT completed +1»

and creates a dated activity record.

---

13. Progress screen

PG can see:

Procedures

RCT — 43
Retreatment — 11
Post & Core — 8
Surgical Endo — 3

Special Cases

Completed — 7
Ongoing — 2

If formal targets are configured:

«Retreatment: 8 / 10»

Later:

«Behind / on track»

But no intelligence layer yet.

---

14. Logbook

OraMedha generates the underlying record automatically.

Possible fields:

- Date
- OPD no.
- Patient
- Tooth
- Procedure
- Status

Later:

- PDF export
- Excel export
- department-specific templates
- faculty/HOD signature workflows

Not necessary for first build.

---

15. Case closure

When treatment is complete:

PG taps:

Complete Case

OraMedha:

- marks clinical case complete
- preserves full timeline
- keeps all files
- updates procedure counts
- updates logbook
- optionally creates review/recall appointment if needed

The case remains searchable forever.

---

16. The Core Loop

The entire product should reduce to this:

Patient added
→ appointment scheduled
→ patient informed
→ patient treated
→ visit updated
→ next step inferred
→ next appointment scheduled
→ files retained
→ progress/logbook updated automatically
→ repeat until case complete

The PG should mostly interact with:

Today

Patient

Update Visit

Everything else should happen in the background wherever possible.

---

17. Product Standard

The experience should feel like:

«“I update what clinically happened. OraMedha handles everything around it.”»

Not:

«“I now have another software system to maintain.”»

That distinction should drive every product decision.