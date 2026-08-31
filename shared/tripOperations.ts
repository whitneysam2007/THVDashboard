export const TRIP_EXPENSE_CATEGORIES = ['Lodging', 'Supplies (pre-trip)', 'T-shirts', 'Food', 'Transportation', 'Program & Supplies', 'Garden Towers', 'Translation & Local Staff', 'Excursion', 'Other'] as const;
export type TripExpenseCategory = (typeof TRIP_EXPENSE_CATEGORIES)[number];

export type TripExpense = {
  id: string;
  description: string;
  category?: TripExpenseCategory;
  subcategory?: string;
  usdAmount?: number;
  quetzalAmount?: number;
  paymentOwner?: string;
  receiptLink?: string;
  receiptDocument?: {
    name: string;
    key: string;
    mimeType?: string;
    uploadedAt: string;
  };
  notes?: string;
};

export type TripPlanningTask = {
  id: string;
  title: string;
  owner?: string;
  dueDate?: string;
  completed?: boolean;
  notes?: string;
  position: number;
  parentTaskId?: string;
  templateKey?: string;
};

export type TripFlightDetails = {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureDateTime?: string;
  outboundDepartureTime?: string;
  outboundLandingTime?: string;
  returnDateTime?: string;
  returnDepartureTime?: string;
  returnLandingTime?: string;
  bookingReference?: string;
  seatNotes?: string;
  baggageNotes?: string;
};

export type TripItineraryActivity = {
  id: string;
  title: string;
  time?: string;
  notes?: string;
};

export type TripItineraryDay = {
  date: string;
  activities: TripItineraryActivity[];
};

export type TripActivityGroup = {
  id: string;
  activityName: string;
  date: string;
  groupName: string;
  leader: string;
  members: string[];
  notes?: string;
};

export type TripLodgingAssignment = {
  id: string;
  roomNumber: string;
  capacity?: number;
  members: string[];
  notes?: string;
};

export type TripGuateTeamDocument = {
  id: string;
  name: string;
  category: 'Garden Tower' | 'Family market list' | 'Home visits' | 'Other';
  key: string;
  mimeType?: string;
  uploadedAt: string;
};

export type TripPhotoLink = {
  id: string;
  label: string;
  url: string;
  addedAt: string;
};

export type TripOperations = {
  expenses?: TripExpense[];
  quetzalesPerUsd?: number;
  expenseDivisor?: number;
  leaderLogistics?: Record<string, { purchasedTicket?: boolean; flight?: TripFlightDetails }>;
  planningTasks?: TripPlanningTask[];
  itineraryDays?: TripItineraryDay[];
  activityGroups?: TripActivityGroup[];
  lodgingAssignments?: TripLodgingAssignment[];
  guateTeamDocuments?: TripGuateTeamDocument[];
  photoLinks?: TripPhotoLink[];
  gardenTowers?: number;
  gardenTowerFundsUsd?: number;
  gardenTowerFundsReceived?: boolean;
  gardenTowerDocumentUrl?: string;
  usanaProject?: {
    contractNumber?: string;
    totalFundsUsd?: number;
    fundsReceived?: boolean;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
  };
};

export type TripLogistics = {
  depositPaid?: boolean;
  depositDate?: string;
  flight?: TripFlightDetails;
};
