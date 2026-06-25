"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BedDouble,
  Users,
  CalendarCheck,
  Building2,
  BarChart3,
  UserPlus,
  CalendarPlus,
  Sparkles,
  LogIn,
  LogOut,
  DollarSign,
  Home,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardStats, getRoomsWithStatus } from "@/actions";
import type { DashboardStats } from "@/types";
import type { RoomStatus, RoomType } from "@prisma/client";

interface DashboardViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

interface RoomStay {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: Date;
  expectedCheckOut: Date;
  guest: { id: string; fullName: string };
}

interface RoomReservation {
  id: string;
  guestId: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  guest: { id: string; fullName: string };
}

interface RoomCard {
  id: string;
  roomNumber: string;
  floor: number;
  type: RoomType;
  capacity: number;
  pricePerNight: number;
  status: RoomStatus;
  currentStay: RoomStay | null;
  currentReservation: RoomReservation | null;
}

type StatusKey = RoomStatus;

interface StatusConfig {
  label: string;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  dotClass: string;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  AVAILABLE: {
    label: "متاحة",
    borderClass: "border-r-emerald-500",
    bgClass: "bg-emerald-500/5",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  OCCUPIED: {
    label: "مشغولة",
    borderClass: "border-r-rose-500",
    bgClass: "bg-rose-500/5",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
    dotClass: "bg-rose-500",
  },
  CLEANING: {
    label: "تنظيف",
    borderClass: "border-r-amber-500",
    bgClass: "bg-amber-500/5",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  MAINTENANCE: {
    label: "صيانة",
    borderClass: "border-r-muted-foreground/40",
    bgClass: "bg-muted/50",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  RESERVED: {
    label: "محجوزة",
    borderClass: "border-r-teal-500",
    bgClass: "bg-teal-500/5",
    badgeClass:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
    dotClass: "bg-teal-500",
  },
};

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  SINGLE: "فردي",
  DOUBLE: "مزدوج",
  TWIN: "توأم",
  SUITE: "جناح",
  DELUXE: "ديلوكس",
  FAMILY: "عائلي",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "SDG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getRemainingNights(expectedCheckOut: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const checkOut = new Date(expectedCheckOut);
  checkOut.setHours(0, 0, 0, 0);
  const days = Math.ceil((checkOut.getTime() - now.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

function groupRoomsByFloor(rooms: RoomCard[]): Map<number, RoomCard[]> {
  const m = new Map<number, RoomCard[]>();
  for (const room of rooms) {
    const existing = m.get(room.floor);
    if (existing) {
      existing.push(room);
    } else {
      m.set(room.floor, [room]);
    }
  }
  return m;
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="gap-2 py-4 px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-12 mt-1" />
        </Card>
      ))}
    </div>
  );
}

function RoomGridSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <Card className="gap-0 py-4 px-4">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4 shrink-0" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold tracking-tight leading-none">
            {value}
          </span>
        </div>
        {subValue && (
          <p className="mt-1 text-xs text-muted-foreground">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RoomCardComponent({
  room,
  onClick,
}: {
  room: RoomCard;
  onClick: () => void;
}) {
  const config = STATUS_CONFIG[room.status];
  const remainingNights = room.currentStay?.expectedCheckOut
    ? getRemainingNights(room.currentStay.expectedCheckOut)
    : null;
  const guestName = room.currentStay
    ? room.currentStay.guest.fullName
    : (room.currentReservation?.guest.fullName ?? null);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-right rounded-lg border border-r-4 p-3 transition-all
        hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer
        ${config.borderClass} ${config.bgClass}`}
      aria-label={`غرفة ${room.roomNumber}، ${config.label}`}
    >
      <div className="flex items-center justify-between gap-1">
        <Badge
          variant="secondary"
          className={`${config.badgeClass} text-[10px] px-1.5 py-0 border-0 shrink-0`}
        >
          <span
            className={`size-1.5 rounded-full ${config.dotClass} shrink-0`}
          />
          {config.label}
        </Badge>
        <span className="text-sm font-semibold tracking-tight truncate">
          {room.roomNumber}
        </span>
      </div>

      {guestName && (
        <p className="mt-1.5 text-xs text-foreground/80 truncate font-medium">
          {guestName}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
        {remainingNights !== null ? (
          <span className="shrink-0 font-medium text-foreground/60">
            {remainingNights} ليلة متبقية
          </span>
        ) : (
          <span />
        )}
        <span className="truncate">
          {ROOM_TYPE_LABELS[room.type]} · ط{room.floor}
        </span>
      </div>
    </button>
  );
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rooms, setRooms] = useState<RoomCard[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingStats(true);
    setLoadingRooms(true);
    setError(null);
    try {
      const [statsResult, roomsResult] = await Promise.all([
        getDashboardStats(),
        getRoomsWithStatus(),
      ]);
      setStats(statsResult);
      setRooms(roomsResult as unknown as RoomCard[]);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("تعذر تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoadingStats(false);
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const roomsByFloor = useMemo(() => groupRoomsByFloor(rooms), [rooms]);
  const sortedFloors = useMemo(
    () => Array.from(roomsByFloor.keys()).sort((a, b) => a - b),
    [roomsByFloor],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          لوحة التحكم
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نظرة عامة فورية على عمليات الفندق
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchData}
            >
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="المؤشرات الرئيسية">
        {loadingStats ? (
          <StatsCardsSkeleton />
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <StatsCard
              icon={BedDouble}
              label="إجمالي الغرف"
              value={stats.totalRooms}
              subValue={`${stats.occupancyRate}% إشغال`}
            />
            <StatsCard
              icon={Users}
              label="مشغولة"
              value={stats.occupiedRooms}
            />
            <StatsCard icon={Home} label="متاحة" value={stats.availableRooms} />
            <StatsCard
              icon={Sparkles}
              label="تنظيف"
              value={stats.cleaningRooms}
            />
            <StatsCard
              icon={LogIn}
              label="تسجيل دخول اليوم"
              value={stats.todayCheckins}
            />
            <StatsCard
              icon={LogOut}
              label="تسجيل خروج اليوم"
              value={stats.todayCheckouts}
            />
            <StatsCard
              icon={DollarSign}
              label="إيرادات اليوم"
              value={formatCurrency(stats.dailyRevenue)}
            />
          </div>
        ) : null}
      </section>

      <section aria-label="إجراءات سريعة">
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="px-6 py-4 pb-0">
            <CardTitle className="text-base">إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 px-3"
                onClick={() => onNavigate("checkin")}
              >
                <LogIn className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium">تسجيل دخول جديد</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 px-3"
                onClick={() => onNavigate("guests", { action: "new" })}
              >
                <UserPlus className="size-5 text-primary" />
                <span className="text-xs font-medium">إضافة ضيف</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 px-3"
                onClick={() => onNavigate("reservations", { action: "new" })}
              >
                <CalendarPlus className="size-5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-medium">إنشاء حجز</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 px-3"
                onClick={() => onNavigate("reports")}
              >
                <BarChart3 className="size-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium">عرض التقارير</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-label="حالة الغرف">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            حالة الغرف المباشرة
          </h2>
          {rooms.length > 0 && !loadingRooms && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span
                    className={`size-2 rounded-full ${STATUS_CONFIG[status].dotClass}`}
                  />
                  {STATUS_CONFIG[status].label}
                </span>
              ))}
            </div>
          )}
        </div>

        {loadingRooms ? (
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <RoomGridSkeleton key={i} />
            ))}
          </div>
        ) : sortedFloors.length > 0 ? (
          <div className="space-y-6">
            {sortedFloors.map((floor) => {
              const floorRooms = roomsByFloor.get(floor) ?? [];
              return (
                <div key={floor}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Building2 className="size-3.5" />
                    الطابق {floor}
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {floorRooms.length} غرفة
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                    {floorRooms.map((room) => (
                      <RoomCardComponent
                        key={room.id}
                        room={room}
                        onClick={() => onNavigate("rooms", { roomId: room.id })}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center p-6">
              <Building2 className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                لم يتم العثور على غرف
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
