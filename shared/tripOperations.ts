export type TripExpense = {
  id: string;
  description: string;
  usdAmount?: number;
  quetzalAmount?: number;
  paymentOwner?: string;
  receiptLink?: string;
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
};

export type TripFlightDetails = {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureDateTime?: string;
  returnDateTime?: string;
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

export type TripGuateTeamDocument = {
  id: string;
  name: string;
  category: 'Garden Tower' | 'Family market list' | 'Home visits' | 'Other';
  key: string;
  mimeType?: string;
  uploadedAt: string;
};

export type TripOperations = {
  expenses?: TripExpense[];
  quetzalesPerUsd?: number;
  expenseDivisor?: number;
  leaderLogistics?: Record<string, { purchasedTicket?: boolean; flight?: TripFlightDetails }>;
  planningTasks?: TripPlanningTask[];
  itineraryDays?: TripItineraryDay[];
  guateTeamDocuments?: TripGuateTeamDocument[];
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
