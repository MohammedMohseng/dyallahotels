'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getReservations,
  createReservation,
  updateReservationStatus,
  getGuests,
  getAvailableRooms,
} from '@/actions'
import { Plus, Search, Check, X, LogIn } from 'lucide-react'

interface ReservationsViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void
}

interface GuestOption {
  id: string
  fullName: string
  phone: string
}

export interface RoomOption {
  id: string
  roomNumber: string
  type: string
  floor: number
  pricePerNight: number
}

interface ReservationRow {
  id: string
  startDate: Date
  endDate: Date
  deposit: number
  status: string
  notes: string | null
  guest: { fullName: string; phone: string }
  room: { roomNumber: string; type: string; floor: number }
}

const STATUS_BADGE_MAP: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  CHECKED_IN: 'outline',
}

const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: 'معلّق',
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغى',
  CHECKED_IN: 'تم تسجيل الدخول',
}

const ROOM_TYPE_MAP: Record<string, string> = {
  SINGLE: 'فردي',
  DOUBLE: 'مزدوج',
  TWIN: 'توأم',
  SUITE: 'جناح',
  DELUXE: 'ديلوكس',
  FAMILY: 'عائلي',
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'SDG' }).format(amount)

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('ar-EG')

export default function ReservationsView({ onNavigate }: ReservationsViewProps) {
  const [reservations, setReservations] = useState<ReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [guestSearch, setGuestSearch] = useState('')
  const [guestResults, setGuestResults] = useState<GuestOption[]>([])
  const [selectedGuestId, setSelectedGuestId] = useState('')
  const [selectedGuestName, setSelectedGuestName] = useState('')
  const [availableRooms, setAvailableRooms] = useState<RoomOption[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const filters = statusFilter !== 'ALL' ? { status: statusFilter } : undefined
      const data = await getReservations(filters)
      setReservations(data as ReservationRow[])
    } catch {
      toast.error('فشل في تحميل الحجوزات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  const handleGuestSearch = useCallback(async (query: string) => {
    setGuestSearch(query)
    if (query.length < 1) {
      setGuestResults([])
      return
    }
    try {
      const results = await getGuests(query)
      setGuestResults(results as GuestOption[])
    } catch {
      toast.error('فشل في البحث عن الضيوف')
    }
  }, [])

  const handleSelectGuest = (guest: GuestOption) => {
    setSelectedGuestId(guest.id)
    setSelectedGuestName(guest.fullName)
    setGuestSearch(guest.fullName)
    setGuestResults([])
  }

  const handleOpenDialog = async () => {
    setDialogOpen(true)
    try {
      const rooms = await getAvailableRooms()
      setAvailableRooms(rooms as RoomOption[])
    } catch {
      toast.error('فشل في تحميل الغرف المتاحة')
    }
  }

  const resetForm = () => {
    setGuestSearch('')
    setGuestResults([])
    setSelectedGuestId('')
    setSelectedGuestName('')
    setSelectedRoomId('')
    setStartDate('')
    setEndDate('')
    setDeposit('')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!selectedGuestId) {
      toast.error('يرجى اختيار الضيف')
      return
    }
    if (!selectedRoomId) {
      toast.error('يرجى اختيار الغرفة')
      return
    }
    if (!startDate || !endDate) {
      toast.error('يرجى تحديد تاريخ البداية والنهاية')
      return
    }

    setSubmitting(true)
    try {
      const result = await createReservation({
        guestId: selectedGuestId,
        roomId: selectedRoomId,
        startDate,
        endDate,
        deposit: parseFloat(deposit) || 0,
        notes: notes || null,
      })

      if ('error' in result && result.error) {
        toast.error(result.error)
      } else {
        toast.success('تم إنشاء الحجز بنجاح')
        setDialogOpen(false)
        resetForm()
        fetchReservations()
      }
    } catch {
      toast.error('فشل في إنشاء الحجز')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateReservationStatus(id, status)
      toast.success(`تم تحديث حالة الحجز بنجاح`)
      fetchReservations()
    } catch {
      toast.error('فشل في تحديث حالة الحجز')
    }
  }

  const filterTabs = [
    { value: 'ALL', label: 'الكل' },
    { value: 'PENDING', label: 'معلّق' },
    { value: 'CONFIRMED', label: 'مؤكد' },
    { value: 'CANCELLED', label: 'ملغى' },
    { value: 'CHECKED_IN', label: 'تم تسجيل الدخول' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الحجوزات</h2>
          <p className="text-muted-foreground">إدارة حجوزات الضيوف</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="ml-2 h-4 w-4" />
              حجز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إنشاء حجز</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Guest Search */}
              <div className="space-y-2">
                <Label>الضيف</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو رقم الهاتف..."
                    value={guestSearch}
                    onChange={(e) => handleGuestSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
                {selectedGuestId && (
                  <p className="text-sm text-muted-foreground">
                    المحدد: <span className="font-medium text-foreground">{selectedGuestName}</span>
                  </p>
                )}
                {guestResults.length > 0 && (
                  <div className="rounded-md border-border max-h-40 overflow-y-auto">
                    {guestResults.map((guest) => (
                      <button
                        key={guest.id}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-accent flex justify-between items-center"
                        onClick={() => handleSelectGuest(guest)}
                      >
                        <span>{guest.phone}</span>
                        <span>{guest.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Room Select */}
              <div className="space-y-2">
                <Label>الغرفة</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الغرفة المتاحة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.roomNumber} - {ROOM_TYPE_MAP[room.type] || room.type} (الطابق {room.floor}) - {formatCurrency(room.pricePerNight)}/ليلة
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ البداية</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ النهاية</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Deposit */}
              <div className="space-y-2">
                <Label>مبلغ العربون</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'جارٍ الإنشاء...' : 'إنشاء حجز'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {filterTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الحجوزات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حجوزات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الضيف</TableHead>
                    <TableHead>الغرفة</TableHead>
                    <TableHead>تاريخ البداية</TableHead>
                    <TableHead>تاريخ النهاية</TableHead>
                    <TableHead>العربون</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.guest.fullName}</div>
                          <div className="text-sm text-muted-foreground">{reservation.guest.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.room.roomNumber}</div>
                          <div className="text-sm text-muted-foreground">{ROOM_TYPE_MAP[reservation.room.type] || reservation.room.type}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(reservation.startDate)}</TableCell>
                      <TableCell>{formatDate(reservation.endDate)}</TableCell>
                      <TableCell>{formatCurrency(reservation.deposit)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_MAP[reservation.status] || 'secondary'}>
                          {STATUS_LABEL_MAP[reservation.status] || reservation.status.replace('_', '-')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-1">
                          {reservation.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(reservation.id, 'CONFIRMED')}
                              >
                                <Check className="h-3 w-3 ml-1" />
                                تأكيد
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(reservation.id, 'CANCELLED')}
                              >
                                <X className="h-3 w-3 ml-1" />
                                إلغاء
                              </Button>
                            </>
                          )}
                          {reservation.status === 'CONFIRMED' && (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(reservation.id, 'CANCELLED')}
                              >
                                <X className="h-3 w-3 ml-1" />
                                إلغاء
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => onNavigate('checkin')}
                              >
                                <LogIn className="h-3 w-3 ml-1" />
                                تسجيل الدخول
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}