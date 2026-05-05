# HabitQuest — Hackathon Demo Script

**Target duration:** 3–5 minutes  
**Format:** Live conversation + dashboard tab open side by side  
**Presenter:** walks through a scripted user story, no slides needed

---

## Overview

The story is one person trying to take care of their day. The agent is the product. The dashboard is the companion. Everything else is supporting detail.

---

## 1. Hook (0:00–0:30)

**Say:**
> "Every day people open 4 different apps to try to stay on track — a calendar, a notes app, a habit tracker, a to-do list. None of them adapt when energy drops, time shrinks, or plans fall apart. HabitQuest is different. The conversation *is* the product."

**Action:** open the chat interface — blank, no prior history.

---

## 2. First message — the agent starts working (0:30–1:00)

**Type in chat:**
> "Quiero organizarme mejor. Me cuesta mantener hábitos y termino el día sin haber hecho nada que me importe."

**What to say while the agent responds:**
> "No forms. No setup wizards. Just talk."

**Expected agent behavior:** short conversational onboarding — asks about goals, preferred activities, and what reward the user wants to earn.

---

## 3. Onboarding + daily plan (1:00–2:00)

**Type:**
> "Mis objetivos son tener más energía y concentrarme mejor. Me gusta caminar, meditar y leer. Como recompensa quiero 30 minutos de gaming."

**What to say:**
> "The agent calls a domain tool under the hood — completeOnboarding — and stores goals, activities, and that gaming reward. Now watch what happens when we ask for a plan."

**Type:**
> "Armate el plan de hoy."

**Expected agent behavior:** calls `generateDailyPlan`, returns 3–4 activities with duration and points.

**Switch to dashboard tab:**
> "Meanwhile here in the dashboard — the plan appeared automatically. No refresh. The dashboard is a companion, not a separate app."

---

## 4. Check-in and adaptation (2:00–3:00)

**Back to chat. Say:**
> "It's midday. Energy is low. In any other system you'd just abandon the plan. Here..."

**Type:**
> "Estoy cansado. Caminé un rato pero no tengo energía para lo demás."

**Expected agent behavior:** calls `logCheckIn` with fatigue intent, adapts the plan to lighter activities, reports the adaptation.

**Say:**
> "The agent detects fatigue, logs it, and replaces heavy items with lighter ones. The original items are preserved as history — not deleted."

**Switch to dashboard tab:**
> "The updated plan is already here."

---

## 5. Completion and reward (3:00–4:00)

**Back to chat. Say:**
> "Let's complete something and unlock the reward."

**Type:**
> "Completé la meditación."

**Expected agent behavior:** calls `completePlanItem`, awards points, reports available balance.

**Type:**
> "¿Puedo canjear el gaming?"

**Expected agent behavior:** calls `redeemReward` and confirms, or explains how many points are still needed and suggests a short activity to unlock it.

**Switch to dashboard tab:**
> "Points move in real time — earned, spent, available. All here."

---

## 6. Technical close (4:00–4:30)

**Say:**
> "Under the hood: Next.js on Vercel, Supabase for auth and data, Vercel AI SDK for the agent tool loop. The same conversation runs over the web interface and Telegram through a shared adapter. The agent is the core. The dashboard is its companion surface. Same data, two views."

---

## Fallback: if the external channel adapter is not ready

If Telegram or WhatsApp is unavailable or unstable during the demo:

1. **Skip any mention of external channels.** Do not show or reference them.
2. **Stay entirely on the web chat.** The full core loop — onboarding, plan, check-in, completion, reward — works without any external adapter.
3. **Prepared line if channels come up:**
   > "The Telegram adapter is already built and tested. We're keeping it out of scope today to avoid depending on external services during the presentation."
4. **If pressed:** point to `tests/habitquest-bot.test.ts` as evidence the adapter exists and is tested.

---

## Timing cheatsheet

| Segment | Time | Tool called |
|---------|------|-------------|
| Hook | 0:00–0:30 | — |
| First message | 0:30–1:00 | — |
| Onboarding + plan | 1:00–2:00 | `completeOnboarding`, `generateDailyPlan` |
| Check-in + adaptation | 2:00–3:00 | `logCheckIn` |
| Completion + reward | 3:00–4:00 | `completePlanItem`, `redeemReward` |
| Technical close | 4:00–4:30 | — |

---

## Pre-demo checklist

- [ ] Account created and seeded with activities and rewards
- [ ] Two tabs open: chat on the left, dashboard on the right
- [ ] Dashboard loaded on today's date
- [ ] Chat history cleared — fresh conversation
- [ ] Network stable (agent calls Supabase + Anthropic in real time)
- [ ] Fallback line memorized
