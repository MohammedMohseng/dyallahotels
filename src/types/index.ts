import type { Role } from '@prisma/client'

export type AppRole = Role

export interface NavItem {
  title: string
  icon: string
  href: string
  roles: AppRole[]
}

export interface DashboardStats {
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  cleaningRooms: number
  maintenanceRooms: number
  reservedRooms: number
  todayCheckins: number
  todayCheckouts: number
  dailyRevenue: number
  occupancyRate: number
}

export interface RoomWithStay extends Room {
  currentStay?: {
    id: string
    guest: { id: string; fullName: string }
    checkIn: Date
    expectedCheckOut: Date
  } | null
}

import type {
  Room, Guest, Stay, Reservation, Payment, Company, User
} from '@prisma/client'

export type { Room, Guest, Stay, Reservation, Payment, Company, User }