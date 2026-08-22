export const MEDICAL_TASK_ASSIGNEES = ['Emily', 'Liz', 'Amy', 'Kirsten', 'Brenley', 'Lauren', 'Anna', 'Yvonne/Nieve'] as const;
export const MEDICAL_TASK_CATEGORIES = ['Volunteer profiles & credentials', 'Expedition readiness', 'Clinical planning & supplies', 'Guatemala coordination', 'Follow-up & records', 'Other'] as const;

export type MedicalTaskAssignee = (typeof MEDICAL_TASK_ASSIGNEES)[number];
export type MedicalTaskCategory = (typeof MEDICAL_TASK_CATEGORIES)[number];

export type MedicalTask = {
  id: string;
  title: string;
  owner: MedicalTaskAssignee;
  category: MedicalTaskCategory;
  dueDate?: string;
  notes?: string;
  completed?: boolean;
  completedAt?: string;
};

export function sortMedicalTasks(tasks: MedicalTask[]) {
  return [...tasks].sort((first, second) => {
    if (Boolean(first.completed) !== Boolean(second.completed)) return first.completed ? 1 : -1;
    const firstDate = first.dueDate ?? '9999-12-31';
    const secondDate = second.dueDate ?? '9999-12-31';
    return firstDate.localeCompare(secondDate) || first.title.localeCompare(second.title);
  });
}
