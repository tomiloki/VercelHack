import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildOnboardingPersistenceInput,
  buildOnboardingSummary,
  createEmptyOnboardingDraft,
  isOnboardingComplete,
  parseAvailableMinutes,
  resolveGoalSelection,
} from '../lib/ai/habitquest-onboarding'

test('resolveGoalSelection maps free-text wellbeing goals to known ids', () => {
  const goalIds = resolveGoalSelection('Quiero más foco, menos estrés y mejorar el descanso')

  assert.deepEqual(goalIds, ['focus', 'sleep', 'stress'])
})

test('parseAvailableMinutes extracts practical time windows from text', () => {
  assert.equal(parseAvailableMinutes('Tengo 45 minutos por día'), 45)
  assert.equal(parseAvailableMinutes('Solo media hora'), 30)
  assert.equal(parseAvailableMinutes('Muy poco tiempo, capaz 15 min'), 15)
})

test('buildOnboardingPersistenceInput trims and dedupes custom activities and rewards', () => {
  const payload = buildOnboardingPersistenceInput({
    ...createEmptyOnboardingDraft(),
    displayName: 'Tomi',
    goalIds: ['focus', 'stress'],
    desiredActivities: ['Caminar 15 minutos', 'Caminar 15 minutos', 'Respirar profundo'],
    desiredRewards: ['Mate tranquilo', 'Mate tranquilo', 'Un episodio'],
  })

  assert.deepEqual(payload.goalIds, ['focus', 'stress'])
  assert.deepEqual(payload.customActivityNames, ['Caminar 15 minutos', 'Respirar profundo'])
  assert.deepEqual(payload.customRewardNames, ['Mate tranquilo', 'Un episodio'])
})

test('buildOnboardingSummary returns a readable recap for the final assistant message', () => {
  const summary = buildOnboardingSummary({
    ...createEmptyOnboardingDraft(),
    displayName: 'Luz',
    goalIds: ['focus'],
    desiredActivities: ['Caminar 15 minutos'],
    avoidPatterns: ['scroll infinito'],
    availableMinutes: 30,
    desiredRewards: ['un café especial'],
  })

  assert.match(summary, /Luz/)
  assert.match(summary, /Better focus/)
  assert.match(summary, /Caminar 15 minutos/)
  assert.match(summary, /30 minutos/)
})

test('isOnboardingComplete depends on persisted goals, activities, and rewards', () => {
  assert.equal(isOnboardingComplete({ goalCount: 1, activityCount: 2, rewardCount: 1 }), true)
  assert.equal(isOnboardingComplete({ goalCount: 1, activityCount: 0, rewardCount: 1 }), false)
})
