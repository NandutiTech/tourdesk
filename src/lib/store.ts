import { create } from 'zustand'
import { AppState, Artist, Tour, Meeting, Replacement, Trip, Expense, Guest, Contact, ManagerTour, DEFAULT_HOURS } from './types'

const now = new Date()

interface StoreState extends AppState {
  // Auth
  token: string | null
  userEmail: string | null
  isLoaded: boolean

  // Actions - state
  setToken: (token: string, email: string) => void
  setLoaded: (loaded: boolean) => void
  applyCloudData: (data: Partial<AppState>) => void

  // Actions - artists
  addArtist: (artist: Artist) => void
  updateArtist: (artist: Artist) => void
  deleteArtist: (id: string) => void

  // Actions - tours
  addTour: (tour: Tour) => void
  addTours: (tours: Tour[]) => void
  updateTour: (tour: Tour) => void
  deleteTour: (id: string) => void

  // Actions - meetings
  addMeeting: (meeting: Meeting) => void
  updateMeeting: (meeting: Meeting) => void
  deleteMeeting: (id: string) => void

  // Actions - replacements
  addReplacement: (sub: Replacement) => void
  updateReplacement: (sub: Replacement) => void
  deleteReplacement: (id: string) => void

  // Actions - trips
  addTrip: (trip: Trip) => void
  updateTrip: (trip: Trip) => void
  deleteTrip: (id: string) => void

  // Actions - expenses
  addExpense: (expense: Expense) => void
  updateExpense: (expense: Expense) => void
  deleteExpense: (id: string) => void

  // Actions - guests
  addGuest: (guest: Guest) => void
  updateGuest: (guest: Guest) => void
  deleteGuest: (id: string) => void
  cycleGuestStatus: (id: string) => void

  // Actions - contacts
  addContact: (contact: Contact) => void
  updateContact: (contact: Contact) => void
  deleteContact: (id: string) => void

  // Actions - manager tours
  addMgrTour: (tour: ManagerTour) => void
  updateMgrTour: (tour: ManagerTour) => void
  deleteMgrTour: (id: string) => void

  // Actions - settings
  setCalendar: (y: number, m: number) => void
  setEarnings: (y: number, m: number) => void
  setHoursGoal: (goal: number) => void
  setCachet: (artistId: string, amount: number) => void
  setArtistHours: (artistId: string, hours: number) => void
  setHoursPerEventType: (type: string, hours: number) => void

  // Clear all
  clearAll: () => void
}

const initialState: AppState = {
  artists: [],
  tours: [],
  meetings: [],
  subs: [],
  trips: [],
  expenses: [],
  guests: [],
  contacts: [],
  mgrTours: [],
  cachets: {},
  artistHours: {},
  hoursGoal: 507,
  hoursPerEventType: DEFAULT_HOURS,
  calY: now.getFullYear(),
  calM: now.getMonth(),
  earnY: now.getFullYear(),
  earnM: now.getMonth(),
}

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  token: null,
  userEmail: null,
  isLoaded: false,

  setToken: (token, email) => set({ token, userEmail: email }),
  setLoaded: (loaded) => set({ isLoaded: loaded }),

  applyCloudData: (data) => set((state) => ({
    ...state,
    ...data,
    hoursPerEventType: data.hoursPerEventType || state.hoursPerEventType,
  })),

  // Artists
  addArtist: (artist) => set((s) => ({ artists: [...s.artists, artist] })),
  updateArtist: (artist) => set((s) => ({ artists: s.artists.map(a => a.id === artist.id ? artist : a) })),
  deleteArtist: (id) => set((s) => ({
    artists: s.artists.filter(a => a.id !== id),
    tours: s.tours.filter(t => t.aId !== id)
  })),

  // Tours
  addTour: (tour) => set((s) => ({ tours: [...s.tours, tour] })),
  addTours: (tours) => set((s) => ({ tours: [...s.tours, ...tours] })),
  updateTour: (tour) => set((s) => ({ tours: s.tours.map(t => t.id === tour.id ? tour : t) })),
  deleteTour: (id) => set((s) => ({ tours: s.tours.filter(t => t.id !== id) })),

  // Meetings
  addMeeting: (meeting) => set((s) => ({ meetings: [...s.meetings, meeting] })),
  updateMeeting: (meeting) => set((s) => ({ meetings: s.meetings.map(m => m.id === meeting.id ? meeting : m) })),
  deleteMeeting: (id) => set((s) => ({ meetings: s.meetings.filter(m => m.id !== id) })),

  // Replacements
  addReplacement: (sub) => set((s) => ({ subs: [...s.subs, sub] })),
  updateReplacement: (sub) => set((s) => ({ subs: s.subs.map(r => r.id === sub.id ? sub : r) })),
  deleteReplacement: (id) => set((s) => ({ subs: s.subs.filter(r => r.id !== id) })),

  // Trips
  addTrip: (trip) => set((s) => ({ trips: [...s.trips, trip] })),
  updateTrip: (trip) => set((s) => ({ trips: s.trips.map(t => t.id === trip.id ? trip : t) })),
  deleteTrip: (id) => set((s) => ({ trips: s.trips.filter(t => t.id !== id) })),

  // Expenses
  addExpense: (expense) => set((s) => ({ expenses: [...s.expenses, expense] })),
  updateExpense: (expense) => set((s) => ({ expenses: s.expenses.map(e => e.id === expense.id ? expense : e) })),
  deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter(e => e.id !== id) })),

  // Guests
  addGuest: (guest) => set((s) => ({ guests: [...s.guests, guest] })),
  updateGuest: (guest) => set((s) => ({ guests: s.guests.map(g => g.id === guest.id ? guest : g) })),
  deleteGuest: (id) => set((s) => ({ guests: s.guests.filter(g => g.id !== id) })),
  cycleGuestStatus: (id) => set((s) => ({
    guests: s.guests.map(g => {
      if (g.id !== id) return g
      const statuses = ['confirmed', 'pending', 'cancelled'] as const
      const next = statuses[(statuses.indexOf(g.status) + 1) % statuses.length]
      return { ...g, status: next }
    })
  })),

  // Contacts
  addContact: (contact) => set((s) => ({ contacts: [...s.contacts, contact] })),
  updateContact: (contact) => set((s) => ({ contacts: s.contacts.map(c => c.id === contact.id ? contact : c) })),
  deleteContact: (id) => set((s) => ({ contacts: s.contacts.filter(c => c.id !== id) })),

  // Manager tours
  addMgrTour: (tour) => set((s) => ({ mgrTours: [...s.mgrTours, tour] })),
  updateMgrTour: (tour) => set((s) => ({ mgrTours: s.mgrTours.map(t => t.id === tour.id ? tour : t) })),
  deleteMgrTour: (id) => set((s) => ({ mgrTours: s.mgrTours.filter(t => t.id !== id) })),

  // Settings
  setCalendar: (calY, calM) => set({ calY, calM }),
  setEarnings: (earnY, earnM) => set({ earnY, earnM }),
  setHoursGoal: (hoursGoal) => set({ hoursGoal }),
  setCachet: (artistId, amount) => set((s) => ({ cachets: { ...s.cachets, [artistId]: amount } })),
  setArtistHours: (artistId, hours) => set((s) => ({ artistHours: { ...s.artistHours, [artistId]: hours } })),
  setHoursPerEventType: (type, hours) => set((s) => ({
    hoursPerEventType: { ...s.hoursPerEventType, [type]: hours }
  })),

  clearAll: () => set({ ...initialState }),
}))

// Helpers
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function getToken(): string {
  const state = useStore.getState()
  if (state.token) return state.token
  try { return localStorage.getItem('td_token') || '' } catch { return '' }
}
