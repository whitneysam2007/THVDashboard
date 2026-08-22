import type { TripPlanningTask } from './tripOperations';

export type ExpeditionTemplateItem = {
  key: string;
  title: string;
  owner: string;
  subtasks?: ExpeditionTemplateItem[];
};

const item = (key: string, title: string, owner: string, subtasks?: ExpeditionTemplateItem[]): ExpeditionTemplateItem => ({ key, title, owner, subtasks });

/** Amy's approved Expedition To-Do List. Each listed item becomes its own persisted task. */
export const EXPEDITION_TODO_TEMPLATE: ExpeditionTemplateItem[] = [
  item('participant-communication', 'Organize communication with known participants', 'Kirsten', [
    item('participant-contact-list', 'Gather participant numbers and emails', 'Kirsten'),
    item('participant-fee-schedule', 'Discuss fee schedule', 'Kirsten', [
      item('participant-fee-due-dates', '$500 due September 1; $500 due October 1', 'Kirsten', [
        item('participant-payment-method', 'Decide best way to pay and provide tax write-off information', 'Kirsten'),
      ]),
      item('participant-airline-tickets', 'Airline tickets', 'Kirsten'),
      item('participant-passports', 'Passports', 'Kirsten'),
    ]),
    item('participant-group-zoom', 'Schedule group Zoom calls', 'Kirsten'),
  ]),
  item('guidebook', 'Guidebook', 'Kirsten', [
    item('guidebook-update', 'Update guidebook', 'Kirsten'),
    item('guidebook-send', 'Send guidebook to participants', 'Kirsten'),
  ]),
  item('usana-garden-towers', 'USANA Garden Towers', 'Amy', [
    item('usana-grant', 'Write grant for towers and submit to USANA', 'Amy'),
    item('usana-naru-tower-count', 'Check with Naru on how many Garden Towers are needed', 'Amy'),
    item('usana-materials-price', 'Ask USANA about materials and pricing', 'Amy'),
    item('usana-backpacks', 'Ask USANA about backpacks', 'Amy'),
    item('usana-maintenance-instructions', 'Get Spanish Garden Tower maintenance instructions (Lauren)', 'Lauren'),
    item('usana-materials-pickup', 'Pick up materials', 'Amy'),
    item('usana-training-videos', 'Send project and training videos to participants', 'Amy'),
    item('usana-tower-sowing-time', 'Schedule a participant time to sow towers', 'Amy'),
    item('usana-naru-supplies', 'Coordinate with Naru on needed supplies and THV provisions', 'Amy'),
    item('usana-rene', 'Coordinate with Rene', 'Kirsten'),
    item('usana-work-groups', 'Divide participants into work groups', 'Amy'),
  ]),
  item('ultrasound-machines', 'Hand-held ultrasound machines', 'Amy', [
    item('ultrasound-purchase', 'Purchase hand-held ultrasound machines', 'Kirsten'),
    item('ultrasound-ipads', 'Purchase iPads', 'Amy'),
    item('ultrasound-textbooks', 'Download Spanish textbooks on iPads', 'Amy'),
    item('ultrasound-medical-liaison', 'Ask Emily F about being THV medical liaison', 'Amy', [
      item('ultrasound-spanish-tech', 'Find a willing Spanish-speaking ultrasound tech, radiologist, or OBGYN', 'Amy', [
        item('ultrasound-london-love', 'Ask London Love from Weber', 'Amy'),
        item('ultrasound-programs', 'Ask other ultrasound tech programs or schools', 'Amy'),
        item('ultrasound-emily-training', 'Ask whether Emily wants training with Jim Benedict and to join the trip', 'Amy'),
      ]),
    ]),
  ]),
  item('itinerary', 'Itinerary', 'Amy', [
    item('itinerary-loose-draft', 'Create a loose itinerary', 'Amy'),
    item('itinerary-excursion-ideas', 'Look into possible excursion ideas', 'Kirsten'),
    item('itinerary-rio-dulce', 'Talk to Brenley about Rio Dulce', 'Amy'),
    item('itinerary-coban-caves', 'Decide whether to do the Cobán Caves again', 'Amy'),
    item('itinerary-tortilla-weaving', 'Plan tortilla and weaving demonstrations', 'Amy'),
  ]),
  item('kits', 'Kits', 'Amy', [
    item('kits-inventory', 'Inventory current kits (50 birthing, 6 midwife, 16 modified as of 8/1)', 'Amy'),
    item('kits-yvonne', 'Ask Yvonne how many midwife kits would be ideal', 'Amy'),
    item('kits-donations', 'Find donations for more midwife kits', 'Amy'),
  ]),
  item('transportation', 'Transportation', 'Kirsten', [
    item('transport-airport-barcelo', 'Arrange shuttle from airport to Barceló', 'Amy'),
    item('transport-barcelo-tactic', 'Arrange Barceló to Tactic transportation', 'Kirsten'),
    item('transport-tactic-senahu', 'Arrange Tactic to Senahú transportation', 'Kirsten'),
    item('transport-tower-sites', 'Arrange transport to Garden Tower sites', 'Naru'),
    item('transport-shadow-nurses', 'Arrange transport for shadow nurses', 'Naru'),
    item('transport-charmack', 'Arrange transport to Charmack', 'Kirsten'),
    item('transport-waterfalls', 'Arrange transport to waterfalls', 'Kirsten'),
    item('transport-senahu-excursion', 'Arrange transport from Senahú to excursion site', 'Kirsten'),
    item('transport-excursion-barcelo', 'Arrange transport from excursion to Barceló', 'Kirsten'),
    item('transport-barcelo-market', 'Arrange transport from Barceló to market', 'Kirsten'),
    item('transport-barcelo-airport', 'Arrange transport from Barceló to airport', 'Amy'),
  ]),
  item('food', 'Food', 'Kirsten', [
    item('food-guillermo', 'Talk to Guillermo', 'Kirsten'),
    item('food-sister-in-law', 'Coordinate with sister-in-law', 'Kirsten'),
    item('food-travel-days', 'Plan food for travel days', 'Kirsten'),
    item('food-excursion', 'Plan food for excursion', 'Kirsten'),
  ]),
  item('lodging', 'Lodging', 'Amy', [
    item('lodging-barcelo', 'Book Barceló for first and last day', 'Amy'),
    item('lodging-rio-escondido', 'Book Rio Escondido', 'Amy'),
    item('lodging-senahu', 'Book Senahú lodging', 'Amy'),
    item('lodging-excursion', 'Book excursion lodging (Cobán?)', 'Amy'),
    item('lodging-rooms', 'Divide into rooms', 'Amy'),
  ]),
  item('participant-gifts', 'Participant gifts: backpacks, gloves, and rain ponchos', 'Amy'),
  item('naru-supplies', 'Coordinate with Naru on supplies to bring', 'Amy', [
    item('naru-stretchers', 'Coordinate stretchers', 'Amy'),
    item('naru-other-supplies', 'Coordinate other supplies', 'Amy'),
  ]),
  item('t-shirts', 'T-shirts', 'Amy', [
    item('t-shirts-printer', 'Coordinate Brenley and Liz: same printer and same design?', 'Brenley'),
  ]),
  item('trip-money', 'Get trip money from the bank before arrival', 'Yvonne/Nieve'),
  item('translators', 'Translators arranged', 'Kirsten'),
];

export function buildExpeditionTodoTemplateTasks(idForKey: (key: string) => string): TripPlanningTask[] {
  const tasks: TripPlanningTask[] = [];
  const visit = (templateItem: ExpeditionTemplateItem, parentTaskId?: string) => {
    const id = idForKey(templateItem.key);
    tasks.push({
      id,
      title: templateItem.title,
      owner: templateItem.owner,
      completed: false,
      position: tasks.length,
      parentTaskId,
      templateKey: templateItem.key,
    });
    templateItem.subtasks?.forEach(child => visit(child, id));
  };
  EXPEDITION_TODO_TEMPLATE.forEach(templateItem => visit(templateItem));
  return tasks;
}

export function hasExpeditionTodoTemplate(tasks: TripPlanningTask[]) {
  return tasks.some(task => task.templateKey === 'participant-communication');
}
