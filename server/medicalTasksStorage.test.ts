import { describe, expect, it } from 'vitest';
import { MEDICAL_TASK_ASSIGNEES, MEDICAL_TASK_CATEGORIES, sortMedicalTasks, type MedicalTask } from '../shared/medicalTasks';

describe('medical volunteer task model', () => {
  it('uses named team members only, without a Shared owner', () => {
    expect(MEDICAL_TASK_ASSIGNEES).toEqual(['Emily', 'Liz', 'Amy', 'Kirsten', 'Brenley', 'Lauren', 'Anna', 'Yvonne/Nieve']);
    expect(MEDICAL_TASK_ASSIGNEES).not.toContain('Shared');
    expect(MEDICAL_TASK_CATEGORIES).toContain('Clinical planning & supplies');
  });

  it('sorts active due work before completed tasks', () => {
    const tasks: MedicalTask[] = [
      { id: 'done', title: 'Completed profile', owner: 'Emily', category: 'Volunteer profiles & credentials', completed: true },
      { id: 'later', title: 'Prepare supplies', owner: 'Liz', category: 'Clinical planning & supplies', dueDate: '2026-11-12' },
      { id: 'first', title: 'Confirm role', owner: 'Emily', category: 'Volunteer profiles & credentials', dueDate: '2026-10-01' },
    ];
    expect(sortMedicalTasks(tasks).map(task => task.id)).toEqual(['first', 'later', 'done']);
  });
});
