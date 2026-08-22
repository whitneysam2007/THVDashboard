import { describe, expect, it } from 'vitest';
import { buildExpeditionTodoTemplateTasks, hasExpeditionTodoTemplate } from './expeditionTodoTemplate';

describe('Expedition To-Do template', () => {
  it('materializes every task as an independently actionable item with linked subtasks', () => {
    const tasks = buildExpeditionTodoTemplateTasks(key => `task-${key}`);
    const communication = tasks.find(task => task.templateKey === 'participant-communication');
    const payment = tasks.find(task => task.templateKey === 'participant-payment-method');
    const towerSites = tasks.find(task => task.templateKey === 'transport-tower-sites');

    expect(tasks.length).toBeGreaterThan(50);
    expect(payment?.parentTaskId).toBe('task-participant-fee-due-dates');
    expect(communication?.parentTaskId).toBeUndefined();
    expect(towerSites?.owner).toBe('Naru');
    expect(tasks.every(task => task.owner && task.id && task.templateKey)).toBe(true);
  });

  it('recognizes a trip that already received the approved template', () => {
    const tasks = buildExpeditionTodoTemplateTasks(key => key);
    expect(hasExpeditionTodoTemplate(tasks)).toBe(true);
    expect(hasExpeditionTodoTemplate([])).toBe(false);
  });
});
