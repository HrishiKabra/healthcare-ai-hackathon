# FirstWords eval results

> Providers: On-device (qwen3:1.7b). The keyword baseline column uses no AI.

Run 2026-10-25 23:35 UTC. 13 cases. Scoring: chart fields against a gold chart, medications by drug class, allergies by category, red flags by rule id.

## Summary

| Metric | Keyword baseline | On-device (qwen3:1.7b) |
|---|---:|---:|
| Field accuracy | 59% | 79% |
| Red flag recall | 43% | 93% |
| Red flag precision | 67% | 100% |
| Medication class accuracy | 82% | 52% |
| Allergy category accuracy | 77% | 100% |
| Average seconds per AI call | <0.01 | 2.97 |

Across 13 cases in Spanish, Vietnamese, Mandarin, Arabic, Hindi, Portuguese, English, and ASL, keyword matching found 59% of the gold chart fields and 43% of the red flags (precision 67%), while On-device (qwen3:1.7b) found 79% of the fields and 93% of the red flags (precision 100%). The baseline missed red flags in 8 cases (Spanish: chest pain (demo); Mandarin: dizziness on insulin; Hindi: fall on the stairs, blood thinner without a name; Arabic: tearing chest pain to the back; Spanish: belly pain in pregnancy; Mandarin: chest tightness, denies then reports an aspirin allergy; Hindi: visiting parent, dizzy on insulin (campus); Portuguese: peanut reaction at the dining hall (campus)), almost always because the chief complaint or the medicine was said in everyday words rather than a listed label or drug name. It also raised 3 false alarms: with the complaint unread, high pain looked like "severe pain, unknown cause". Red flags always come from the same deterministic rules; the only difference between the columns is how well free answers are turned into chart fields. That is what the product would lose without AI.

## Cases

| Case | Language | Fields, baseline | Fields, On-device (qwen3:1.7b) | Gold flags | Baseline flags | On-device (qwen3:1.7b) flags |
|---|---|---:|---:|---|---|---|
| Spanish, chest pain (demo) | Spanish | 3/4 | 3/4 | R3 | none (miss) | R3 |
| ASL, fall on blood thinner (demo) | ASL | 3/3 | 3/3 | R1 | R1 | R1 |
| Picture board, stroke (demo) | English | 3/3 | 3/3 | R2 | R2 | R2 |
| Spanish, fall in the bathroom, Xarelto described colloquially | Spanish | 1/2 | 2/2 | R1 | R1 | R1 |
| Mandarin, dizziness on insulin | Mandarin Chinese | 1/2 | 2/2 | R6 | none (miss) | R6 |
| Hindi, fall on the stairs, blood thinner without a name | Hindi | 2/3 | 2/3 | R1 | none (miss) | R1 |
| Vietnamese, trouble breathing with a penicillin-class allergy | Vietnamese | 0/1 | 1/1 | R5 | R5 | R5 |
| Arabic, tearing chest pain to the back | Arabic | 1/4 | 1/4 | R4 | R8 (miss) | none (miss) |
| Spanish, belly pain in pregnancy | Spanish | 2/3 | 2/3 | R7 | R8 (miss) | R7 |
| Mandarin, chest tightness, denies then reports an aspirin allergy | Mandarin Chinese | 0/2 | 2/2 | R3, R9 | R9 (miss) | R3, R9 |
| Vietnamese, fall after a party, head strike while drunk (campus) | Vietnamese | 3/4 | 3/4 | R10 | R10 | R10 |
| Hindi, visiting parent, dizzy on insulin (campus) | Hindi | 1/2 | 2/2 | R6 | none (miss) | R6 |
| Portuguese, peanut reaction at the dining hall (campus) | Portuguese | 0/1 | 1/1 | R5 | R9 (miss) | R5 |

R1 blood thinner with fall or head strike, R2 stroke alert, R3 chest pain with aspirin or NSAID allergy, R4 torn aorta, R5 allergic reaction, R6 check blood sugar, R7 pregnancy with belly pain or bleeding, R8 severe pain with unknown cause, R9 conflicting allergy or medication answers, R10 head strike while intoxicated.

Cases live in `eval/scenarios/`. Each has scripted answers in the patient's language (mostly free answers, many colloquial) and a gold chart with gold red flags.
