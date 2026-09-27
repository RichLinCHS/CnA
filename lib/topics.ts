export const topics = {
  'Nail Salon': ['Greetings & walk-ins', 'Choosing colors', 'Nail shapes', 'Manicures & pedicures', 'Gel versus regular polish', 'Prices', 'Appointments', 'Customer complaints', 'Checkout'],
  Restaurant: ['Taking orders', 'Dietary questions', 'Asking for the check', 'Reservations'],
  Shopping: ['Finding an item', 'Sizes & fitting rooms', 'Returns', 'Paying'],
  Healthcare: ['Booking an appointment', 'Describing symptoms to a clinician', 'Asking for an interpreter', 'Clarifying clinician instructions'],
  Workplace: ['Job interview', 'Meeting a coworker', 'Asking for help', 'Scheduling a meeting'],
  'School & Parents': ["Talking to my child's teacher", 'Parent-teacher meeting', 'Reporting an absence', 'School activities'],
  Travel: ['Airport check-in', 'Hotel check-in', 'Asking for directions', 'Public transportation'],
  'Everyday English': ['Introductions', 'Small talk', 'Making plans', 'Asking for help'],
  'Custom Topic': ['Describe your own situation'],
} as const;
export type Category = keyof typeof topics;
export const categories = Object.keys(topics) as Category[];
export function scenarioPrompt(category: Category, scenario: string) { return `Teach me practical American English for ${category}: ${scenario}.`; }
