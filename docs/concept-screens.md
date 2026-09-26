OraMedha PG — Concept Screens v0.1

Screen 1 — TODAY

Friday, 25 September

Today · 8 patients

9:00 AM
Rahul Sharma
46 · Primary RCT · BMP
✓ Confirmed

10:00 AM
Neha Jain
11 · Retreatment · GP Removal
⚠ Unconfirmed

11:30 AM
Aman Verma
21 · Primary RCT · Obturation
✓ Confirmed

1:00 PM
Riya Singh
Post & Core · Cast Post Placement
✓ Confirmed

[remaining appointments]

---

Pending

2 patients not confirmed
1 patient missed yesterday
1 patient needs next appointment

---

+ Add Patient

Design intent

The PG should open the app and know immediately:

- Who is coming today?
- What am I doing with them?
- Is the patient confirmed?
- Is anything unresolved?

No analytics dashboard.

No unnecessary cards.

---

Screen 2 — PATIENT / CASE

Rahul Sharma

📞 Call / WhatsApp

Tooth: 46
Case: Primary RCT
Current Stage: BMP
Status: Ongoing

---

Next

BMP appointment
Today · 9:00 AM

---

Case Timeline

25 Sep — BMP
Current visit

20 Sep — Access Opening
Completed

18 Sep — Case Started

---

Files

Pre-op X-ray
Access photo
Working-length X-ray

+ Add File

---

Main Action

Update Visit

Secondary:
Reschedule · Message

Design intent

Within five seconds the PG should understand:

«What is this case?
What happened previously?
What am I doing now?
Where are the files?»

No jumping between multiple modules.

---

Screen 3 — UPDATE VISIT

Rahul Sharma · 46

What did you work on today?

BMP

How far did you get?

○ Partial
● Complete

---

If Partial:

OraMedha suggests

Next step: Continue BMP
Duration: 60 min
Suggested appointment: Monday, 28 Sep · 11:00 AM

Confirm & Schedule

Change slot
Change next step

---

If Complete:

OraMedha suggests

Next step: Obturation
Duration: 60 min
Suggested appointment: Wednesday, 30 Sep · 10:30 AM

Confirm & Schedule

Change slot
Change next step

---

Add something from today's visit

📷 Photo
🩻 X-ray
📎 File
📝 Note

---

Save Visit

What happens automatically after Save

- case history updates
- clinical stage updates
- next appointment gets created
- patient communication goes out
- reminder gets scheduled
- progress/logbook record updates
- uploaded files stay with this stage

Design intent

This should be the hero interaction.

The PG records what clinically happened.

OraMedha takes care of everything downstream.

---

Screen 4 — PROGRESS

My Clinical Progress

Endodontics

Primary RCT
43 completed

Retreatment
11 completed

Post & Core
8 completed

Surgical Endo
3 completed

---

Special Cases

7 completed
2 ongoing

---

Recent Log

25 Sep · Rahul · 46 · BMP
25 Sep · Neha · 11 · GP Removal
24 Sep · Aman · 21 · Obturation

View Full Logbook

---

Later

If the PG has specific targets:

Retreatment
8 / 10

Special Cases
7 / 12

But the PG should not manually maintain these numbers.

They are generated from actual work.

---

Workflow Example — Retreatment

This is important to show PGs because it demonstrates the automation.

Visit 1

Patient: Neha
Tooth: 46
Case: Retreatment

PG performs:

Access opening + GP removal

At the end:

GP removal

Partial

PG taps Save.

OraMedha understands:

«Current work incomplete
Next action = Continue GP removal»

It checks:

- PG's average GP-removal duration: 90 min
- PG availability
- existing patients

OraMedha proposes:

Monday · 10:30 AM–12:00 PM

PG confirms.

Patient automatically receives appointment information.

---

Visit 2

PG continues GP removal.

This time:

GP removal → Complete

Further clinical assessment indicates medicament is required.

PG chooses:

Medicament placed → Calcium hydroxide

OraMedha looks up the PG's configured interval for this situation.

It proposes the appropriate future slot.

PG confirms or edits.

Patient is notified automatically.

---

Subsequent Visit

PG opens Today.

Neha already appears at the scheduled time with:

46 · Retreatment · Review / Continue Treatment

No remembering.

No diary searching.

No calling the patient again to figure out a date.

---

Patient Communication Example

After OraMedha schedules:

«Appointment scheduled: Wednesday, 10:30 AM»

Patient receives a WhatsApp message with:

Confirm
Reschedule

If confirmed:

✓ appointment becomes Confirmed.

If Reschedule:

Patient sees only slots permitted by the PG.

If no response:

OraMedha sends one reminder and eventually marks:

⚠ Unconfirmed

The PG can then intervene.

---

Scheduling Control

The PG remains in control at all times.

They can:

- change OraMedha's suggested date
- change duration
- change next clinical step
- manually schedule
- block times
- disable auto-scheduling for a patient
- call instead of WhatsApp
- modify their personal clinical defaults

Automation handles routine work.

Clinical judgment stays with the dentist.

---

What We Show Mahek + Friends

Do not explain every feature first.

Give them these screens and say:

«“Imagine this existed on your phone during tomorrow's clinic. Walk me through how you would actually use it.”»

While they walk through it, observe:

1. Today

Is the information shown enough?
What would they look for first?

2. Patient page

Is anything essential missing?

3. Update Visit

Do Partial / Complete and the suggested next step reflect how cases actually progress?

4. Auto-scheduling

Would they trust the proposed appointment?
What rules are missing?

5. Files

What would they actually upload at each stage?

6. Progress

Which counts actually matter?

Most importantly:

«Where would you still have to leave OraMedha and use a notebook, gallery, WhatsApp, laptop or your memory?»

Every answer to that question is potentially a product gap.

---

Product Test

If we get this right, a normal PG workflow becomes:

Open Today

→ Treat patient

→ Update Visit

→ choose Partial / Complete

→ confirm OraMedha's suggested next action

→ next appointment automatically booked

→ patient automatically informed

→ files stay with case

→ progress/logbook automatically update

→ move to next patient

That is the experience we should be testing.