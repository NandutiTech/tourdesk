export type EventType = 'show' | 'rehearsal' | 'residence' | 'tournage' | 'dj' | 'figuration' | 'workday' | 'travel'

export interface Artist {
  id: string
  name: string
  genre?: string
  color: string
  siret?: string
  address?: string
  nature?: string
  defaultCachet?: number   // € per cachet
  defaultHours?: number    // hours per cachet
}

export interface Tour {
  id: string
  aId: string | null
  title: string
  start: string
  end?: string
  city?: string
  type: EventType
  paid: boolean
  received: boolean
  customCachet?: number | null   // € per cachet override
  customHours?: number | null    // hours per cachet override
  cachetCount?: number           // number of cachets (default 1)
  notes?: string
  address?: string
  hotel?: string
  room?: string
  hotelAddr?: string
  doclink?: string
  feuilleStatus?: 'match' | 'mismatch' | 'received'
  feuilleDocAmount?: number | null
}

export interface Meeting {
  id: string
  title: string
  type: 'online' | 'person'
  date: string
  time?: string
  location?: string
  notes?: string
}

export interface Replacement {
  id: string
  name: string
  inst?: string
  phone?: string
  email?: string
  genre?: string
  notes?: string
}

export interface TicketInfo {
  from?: string
  to?: string
  date?: string
  time?: string
  ref?: string
  seat?: string
  type?: string
  _error?: string
}

export interface TripTicket {
  id: string
  data: string        // base64
  name: string
  mime: string
  info?: TicketInfo
}

export interface Trip {
  id: string
  aId?: string | null
  tourId?: string | null
  outTickets?: TripTicket[]   // multiple outbound tickets
  retTickets?: TripTicket[]   // multiple return tickets
  notes?: string
  // legacy fields kept for compat
  outTicket?: string
  outTicketName?: string
  outInfo?: any
  retTicket?: string
  retTicketName?: string
  retInfo?: any
}

export interface Expense {
  id: string
  aId?: string | null
  tourId?: string | null
  date: string
  amount: number
  cat: 'transport' | 'hotel' | 'food' | 'equipment' | 'other'
  desc?: string
  receipt?: string
  receiptName?: string
  receiptMime?: string
}

export interface Guest {
  id: string
  tourId?: string | null
  name: string
  contact?: string
  count: number
  notes?: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

export interface Contact {
  id: string
  name: string
  role?: string
  company?: string
  contact?: string  // legacy
  phone?: string
  email?: string
  aId?: string | null  // linked artist/project
  last?: string
  followup?: string
  notes?: string
}

export interface ManagerTour {
  id: string
  name: string
  aId?: string | null
  start?: string
  end?: string
  notes?: string
  members: ManagerMember[]
}

export interface ManagerMember {
  id: string
  name: string
  role?: string
  hotel?: string
  room?: string
  hotelAddr?: string
  ticketRef?: string
  ticketLink?: string
  ticketFileName?: string
  notes?: string
}

export interface HoursPerEventType {
  show: number
  rehearsal: number
  residence: number
  tournage: number
  dj: number
  figuration: number
  workday: number
}

export interface AppState {
  artists: Artist[]
  tours: Tour[]
  meetings: Meeting[]
  subs: Replacement[]
  trips: Trip[]
  expenses: Expense[]
  guests: Guest[]
  contacts: Contact[]
  mgrTours: ManagerTour[]
  cachets: Record<string, number>
  artistHours: Record<string, number>
  hoursGoal: number
  hoursPerEventType: HoursPerEventType
  calY: number
  calM: number
  earnY: number
  earnM: number
}

export const DEFAULT_HOURS: HoursPerEventType = {
  show: 12,       // 1 cachet = 12h (France Travail standard)
  rehearsal: 12,  // 1 cachet répétition = 12h
  residence: 8,   // per day
  tournage: 12,   // 1 cachet tournage = 12h
  dj: 12,         // 1 cachet DJ = 12h
  figuration: 8,  // per day
  workday: 7      // journée de travail = 7h
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export const EVENT_COLORS: Record<EventType, string> = {
  show: '#C9A84C',
  rehearsal: '#4C9AC9',
  residence: '#9B59B6',
  tournage: '#E67E22',
  dj: '#1ABC9C',
  figuration: '#E74C3C',
  workday: '#95A5A6',
  travel: '#2ECC71'
}

export const EVENT_LABELS: Record<EventType, string> = {
  show: 'Show',
  rehearsal: 'Rehearsal',
  residence: 'Résidence',
  tournage: 'Tournage',
  dj: 'DJ Set',
  figuration: 'Figuration',
  workday: 'Work day',
  travel: 'Travel'
}
