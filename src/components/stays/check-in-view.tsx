'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getActiveStays, getStayById, performCheckOut, extendStay,
  performCheckIn, getAvailableRooms, getGuests, getDashboardStats
} from '@/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { CalendarCheck, CalendarX, Clock, Plus, Search, ChevronLeft, Check, User, BedDouble, CreditCard, ArrowRight, Loader2 } from 'lucide-react'

interface CheckInViewProps {
  userId: string
  stayId?: string
  onNavigate: (view: string, params?: Record<string, string>) => void
}

const fmt = (n: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'USD' }).format(n)
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('ar-EG')
const nightsBetween = (a: Date, b: Date) => Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (86400000)))

const ROOM_TYPE_AR: Record<string, string> = {
  SINGLE: 'فردي', DOUBLE: 'مزدوج', TWIN: 'توأم', SUITE: 'جناح',
  DELUXE: 'ديلوكس', FAMILY: 'عائلي'
}
const PAYMENT_METHOD_AR: Record<string, string> = {
  CASH: 'نقدي', BANK_TRANSFER: 'تحويل بنكي', MOBILE_PAYMENT: 'دفع موبايل', CARD: 'بطاقة'
}
const STATUS_AR: Record<string, string> = {
  PAID: 'مدفوع', PARTIAL: 'جزئي', UNPAID: 'غير مدفوع', OVERDUE: 'متأخر'
}
const PAYMENT_STATUS_VARIANT: Record<string, any> = {
  PAID: 'default', PARTIAL: 'secondary', UNPAID: 'destructive', OVERDUE: 'destructive'
}

export default function CheckInView({ userId, stayId, onNavigate }: CheckInViewProps) {
  const [activeTab, setActiveTab] = useState(stayId ? 'stays' : 'wizard')
  const [stays, setStays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Checkout dialog
  const [checkoutStay, setCheckoutStay] = useState<any>(null)
  const [extraCharges, setExtraCharges] = useState(0)
  const [checkoutAmount, setCheckoutAmount] = useState(0)
  const [checkoutMethod, setCheckoutMethod] = useState('CASH')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Extend dialog
  const [extendStay, setExtendStay] = useState<any>(null)
  const [newCheckoutDate, setNewCheckoutDate] = useState('')
  const [extendLoading, setExtendLoading] = useState(false)

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0)
  const [guestSearch, setGuestSearch] = useState('')
  const [guestResults, setGuestResults] = useState<any[]>([])
  const [selectedGuest, setSelectedGuest] = useState<any>(null)
  const [showNewGuest, setShowNewGuest] = useState(false)
  const [newGuest, setNewGuest] = useState({ fullName: '', phone: '', nationality: '', gender: 'MALE', notes: '' })
  const [availableRooms, setAvailableRooms] = useState<any[]>([])
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedCheckout, setExpectedCheckout] = useState('')
  const [numGuests, setNumGuests] = useState(1)
  const [stayNotes, setStayNotes] = useState('')
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [checkInLoading, setCheckInLoading] = useState(false)

  const fetchStays = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getActiveStays()
      if (Array.isArray(res)) setStays(res)
    } catch { toast.error('فشل تحميل الإقامات') }
    setLoading(false)
  }, [])

  useEffect(() => { fetchStays() }, [fetchStays])

  const searchGuests = async (q: string) => {
    if (q.length < 1) { setGuestResults([]); return }
    const res = await getGuests(q)
    setGuestResults(Array.isArray(res) ? res : [])
  }

  const selectGuest = (g: any) => {
    setSelectedGuest(g)
    setShowNewGuest(false)
    setWizardStep(1)
  }

  const confirmNewGuest = async () => {
    if (!newGuest.fullName || !newGuest.phone) { toast.error('الاسم والهاتف مطلوبان'); return }
    setSelectedGuest({ id: 'new', fullName: newGuest.fullName, phone: newGuest.phone, nationality: newGuest.nationality, gender: newGuest.gender, isNew: true, ...newGuest })
    setShowNewGuest(false)
    setWizardStep(1)
  }

  const selectRoom = (room: any) => {
    setSelectedRoom(room)
    setWizardStep(2)
  }

  const calcTotal = () => {
    if (!selectedRoom || !checkInDate || !expectedCheckout) return 0
    const nights = nightsBetween(new Date(checkInDate), new Date(expectedCheckout))
    return nights * selectedRoom.pricePerNight
  }

  const confirmCheckIn = async () => {
    if (!selectedGuest || !selectedRoom || !checkInDate || !expectedCheckout) {
      toast.error('يرجى ملء جميع الحقول المطلوبة'); return
    }
    setCheckInLoading(true)
    try {
      const data = {
        guestId: selectedGuest.id,
        roomId: selectedRoom.id,
        checkIn: checkInDate,
        expectedCheckOut: expectedCheckout,
        numberOfGuests: numGuests,
        notes: stayNotes,
        amountPaid,
        paymentMethod,
      }
      // If guest is new, we'd need to create them first - for simplicity handle via existing guest
      if (selectedGuest.isNew) {
        toast.error('يرجى إنشاء الضيف أولاً من صفحة الضيوف'); setCheckInLoading(false); return
      }
      const res = await performCheckIn(data, userId)
      if (res.error) { toast.error(res.error) } else {
        toast.success('تم تسجيل الدخول بنجاح')
        setWizardStep(0); setSelectedGuest(null); setSelectedRoom(null)
        setExpectedCheckout(''); setStayNotes(''); setAmountPaid(0); setNumGuests(1)
        setActiveTab('stays'); fetchStays()
      }
    } catch { toast.error('حدث خطأ أثناء تسجيل الدخول') }
    setCheckInLoading(false)
  }

  const handleCheckout = async () => {
    if (!checkoutStay) return
    setCheckoutLoading(true)
    try {
      const res = await performCheckOut(checkoutStay.id, extraCharges, { amount: checkoutAmount, paymentMethod: checkoutMethod }, userId)
      if (res.error) { toast.error(res.error) } else {
        toast.success('تم تسجيل الخروج بنجاح')
        setCheckoutStay(null); setExtraCharges(0); setCheckoutAmount(0)
        fetchStays()
      }
    } catch { toast.error('حدث خطأ أثناء تسجيل الخروج') }
    setCheckoutLoading(false)
  }

  const handleExtend = async () => {
    if (!extendStay || !newCheckoutDate) return
    setExtendLoading(true)
    try {
      const res = await extendStay(extendStay.id, newCheckoutDate)
      if (res.error) { toast.error(res.error) } else {
        toast.success('تم تمديد الإقامة بنجاح')
        setExtendStay(null); setNewCheckoutDate('')
        fetchStays()
      }
    } catch { toast.error('حدث خطأ') }
    setExtendLoading(false)
  }

  const nights = calcTotal() > 0 ? nightsBetween(new Date(checkInDate), new Date(expectedCheckout)) : 0
  const total = calcTotal()
  const remaining = total - amountPaid

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">تسجيل الدخول والخروج</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="stays" className="gap-2"><CalendarCheck className="w-4 h-4" /> الإقامات النشطة</TabsTrigger>
          <TabsTrigger value="wizard" className="gap-2"><Plus className="w-4 h-4" /> تسجيل دخول جديد</TabsTrigger>
        </TabsList>

        {/* ACTIVE STAYS TAB */}
        <TabsContent value="stays">
          <Card>
            <CardHeader>
              <CardTitle>الإقامات النشطة حالياً</CardTitle>
              <CardDescription>جميع النزلاء المقيمين في الفندق</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : stays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد إقامات نشطة حالياً</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الضيف</TableHead>
                        <TableHead>الغرفة</TableHead>
                        <TableHead>تسجيل الدخول</TableHead>
                        <TableHead>تسجيل الخروج المتوقع</TableHead>
                        <TableHead>الليالي المتبقية</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>المدفوع</TableHead>
                        <TableHead>حالة الدفع</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stays.map((stay: any) => {
                        const remainingNights = Math.max(0, nightsBetween(new Date(), new Date(stay.expectedCheckOut)))
                        return (
                          <TableRow key={stay.id}>
                            <TableCell className="font-medium">{stay.guest.fullName}</TableCell>
                            <TableCell>{stay.room.roomNumber}</TableCell>
                            <TableCell>{fmtDate(stay.checkIn)}</TableCell>
                            <TableCell>{fmtDate(stay.expectedCheckOut)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{remainingNights} ليلة</Badge>
                            </TableCell>
                            <TableCell>{fmt(stay.totalPrice)}</TableCell>
                            <TableCell>{fmt(stay.amountPaid)}</TableCell>
                            <TableCell>
                              <Badge variant={PAYMENT_STATUS_VARIANT[stay.paymentStatus] || 'secondary'}>
                                {STATUS_AR[stay.paymentStatus] || stay.paymentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => {
                                  setCheckoutStay(stay)
                                  setCheckoutAmount(Math.max(0, stay.totalPrice - stay.amountPaid))
                                }}>
                                  <CalendarX className="w-3 h-3" /> خروج
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setExtendStay(stay)
                                  setNewCheckoutDate(new Date(stay.expectedCheckOut).toISOString().split('T')[0])
                                }}>
                                  <Clock className="w-3 h-3" /> تمديد
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHECK-IN WIZARD TAB */}
        <TabsContent value="wizard">
          <Card>
            <CardHeader>
              <CardTitle>معالج تسجيل الدخول</CardTitle>
              <CardDescription>اتبع الخطوات لتسجيل دخول ضيف جديد</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {['الضيف', 'الغرفة', 'تفاصيل الإقامة', 'الدفع'].map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      i <= wizardStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i < wizardStep ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                    {i < 3 && <ArrowRight className={`w-4 h-4 ${i < wizardStep ? 'text-primary' : 'text-muted'}`} />}
                  </div>
                ))}
              </div>

              {/* Step 0: Guest Selection */}
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">اختيار الضيف</h3>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الهاتف أو جواز السفر..."
                      className="pr-10"
                      value={guestSearch}
                      onChange={(e) => { setGuestSearch(e.target.value); searchGuests(e.target.value) }}
                    />
                  </div>
                  {selectedGuest && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedGuest.fullName}</p>
                        <p className="text-sm text-muted-foreground">{selectedGuest.phone} {selectedGuest.nationality && `• ${selectedGuest.nationality}`}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedGuest(null); setWizardStep(0) }}>تغيير</Button>
                    </div>
                  )}
                  {!selectedGuest && guestResults.length > 0 && (
                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                      {guestResults.map((g: any) => (
                        <button key={g.id} className="w-full text-right p-3 hover:bg-accent border-b last:border-0 transition-colors"
                          onClick={() => selectGuest(g)}>
                          <p className="font-medium">{g.fullName}</p>
                          <p className="text-sm text-muted-foreground">{g.phone} {g.nationality && `• ${g.nationality}`}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {!selectedGuest && guestSearch && guestResults.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>لم يتم العثور على ضيف</p>
                      <Button variant="outline" className="mt-3" onClick={() => setShowNewGuest(true)}>
                        <Plus className="w-4 h-4" /> إنشاء ضيف جديد
                      </Button>
                    </div>
                  )}
                  {showNewGuest && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <h4 className="font-semibold">ضيف جديد</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><Label>الاسم الكامل *</Label><Input value={newGuest.fullName} onChange={e => setNewGuest({ ...newGuest, fullName: e.target.value })} /></div>
                        <div><Label>الهاتف *</Label><Input value={newGuest.phone} onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })} /></div>
                        <div><Label>الجنسية</Label><Input value={newGuest.nationality} onChange={e => setNewGuest({ ...newGuest, nationality: e.target.value })} /></div>
                        <div>
                          <Label>الجنس</Label>
                          <Select value={newGuest.gender} onValueChange={v => setNewGuest({ ...newGuest, gender: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">ذكر</SelectItem>
                              <SelectItem value="FEMALE">أنثى</SelectItem>
                              <SelectItem value="OTHER">آخر</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={confirmNewGuest}><Check className="w-4 h-4" /> تأكيد</Button>
                        <Button variant="outline" onClick={() => setShowNewGuest(false)}>إلغاء</Button>
                      </div>
                    </div>
                  )}
                  {selectedGuest && (
                    <div className="flex justify-end">
                      <Button onClick={() => { setWizardStep(1); loadAvailableRooms() }}>التالي <ChevronLeft className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Room Selection */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">اختيار الغرفة</h3>
                    <Button variant="ghost" size="sm" onClick={() => setWizardStep(0)}><ArrowRight className="w-4 h-4" /> رجوع</Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {availableRooms.length === 0 ? (
                      <p className="col-span-full text-center py-8 text-muted-foreground">لا توجد غرف متاحة</p>
                    ) : (
                      availableRooms.map((room: any) => (
                        <button key={room.id}
                          className={`p-3 border rounded-lg text-right transition-all ${
                            selectedRoom?.id === room.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50 hover:bg-accent'
                          }`}
                          onClick={() => selectRoom(room)}
                        >
                          <p className="font-bold text-lg">{room.roomNumber}</p>
                          <p className="text-sm text-muted-foreground">{ROOM_TYPE_AR[room.type] || room.type} • الطابق {room.floor}</p>
                          <p className="text-sm font-semibold mt-1">{fmt(room.pricePerNight)} / ليلة</p>
                          <p className="text-xs text-muted-foreground">سعة: {room.capacity} أشخاص</p>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedRoom && (
                    <div className="flex justify-end">
                      <Button onClick={() => setWizardStep(2)}>التالي <ChevronLeft className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Stay Details */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">تفاصيل الإقامة</h3>
                    <Button variant="ghost" size="sm" onClick={() => setWizardStep(1)}><ArrowRight className="w-4 h-4" /> رجوع</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    <div>
                      <Label>تاريخ تسجيل الدخول</Label>
                      <Input type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>تاريخ تسجيل الخروج المتوقع</Label>
                      <Input type="date" value={expectedCheckout} onChange={e => setExpectedCheckout(e.target.value)} min={checkInDate} />
                    </div>
                    <div>
                      <Label>عدد النزلاء</Label>
                      <Input type="number" min={1} value={numGuests} onChange={e => setNumGuests(parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label>ملاحظات</Label>
                      <Textarea value={stayNotes} onChange={e => setStayNotes(e.target.value)} placeholder="ملاحظات إضافية..." />
                    </div>
                  </div>
                  {nights > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm text-muted-foreground">عدد الليالي</p><p className="text-2xl font-bold">{nights}</p></div>
                        <div><p className="text-sm text-muted-foreground">سعر الليلة</p><p className="text-2xl font-bold">{fmt(selectedRoom?.pricePerNight || 0)}</p></div>
                        <div><p className="text-sm text-muted-foreground">الإجمالي</p><p className="text-2xl font-bold text-primary">{fmt(total)}</p></div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={() => setWizardStep(3)} disabled={nights === 0}>التالي <ChevronLeft className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">الدفع</h3>
                    <Button variant="ghost" size="sm" onClick={() => setWizardStep(2)}><ArrowRight className="w-4 h-4" /> رجوع</Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3 max-w-lg">
                    <div className="flex justify-between"><span className="text-muted-foreground">الضيف:</span><span className="font-medium">{selectedGuest?.fullName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">الغرفة:</span><span className="font-medium">{selectedRoom?.roomNumber}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">المدة:</span><span className="font-medium">{nights} ليلة</span></div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold"><span>الإجمالي:</span><span>{fmt(total)}</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    <div>
                      <Label>المبلغ المدفوع</Label>
                      <Input type="number" min={0} step={0.01} value={amountPaid} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>المبلغ المتبقي</Label>
                      <Input value={fmt(Math.max(0, remaining))} disabled />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>طريقة الدفع</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHOD_AR).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => { setWizardStep(0); setSelectedGuest(null); setSelectedRoom(null) }}>إلغاء</Button>
                    <Button size="lg" onClick={confirmCheckIn} disabled={checkInLoading}>
                      {checkInLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Check className="w-4 h-4" /> تأكيد تسجيل الدخول
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CHECKOUT DIALOG */}
      <Dialog open={!!checkoutStay} onOpenChange={() => setCheckoutStay(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل الخروج</DialogTitle>
          </DialogHeader>
          {checkoutStay && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>الضيف:</span><span className="font-medium">{checkoutStay.guest.fullName}</span></div>
                <div className="flex justify-between"><span>الغرفة:</span><span className="font-medium">{checkoutStay.room.roomNumber}</span></div>
                <div className="flex justify-between"><span>الإجمالي:</span><span className="font-medium">{fmt(checkoutStay.totalPrice)}</span></div>
                <div className="flex justify-between"><span>المدفوع مسبقاً:</span><span className="font-medium">{fmt(checkoutStay.amountPaid)}</span></div>
              </div>
              <div>
                <Label>رسوم إضافية</Label>
                <Input type="number" min={0} value={extraCharges} onChange={e => setExtraCharges(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex justify-between font-medium">
                <span>المجموع الكلي:</span>
                <span>{fmt(checkoutStay.totalPrice + extraCharges)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>المتبقي:</span>
                <span>{fmt(Math.max(0, checkoutStay.totalPrice + extraCharges - checkoutStay.amountPaid))}</span>
              </div>
              <Separator />
              <div>
                <Label>المبلغ المدفوع الآن</Label>
                <Input type="number" min={0} value={checkoutAmount} onChange={e => setCheckoutAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={checkoutMethod} onValueChange={setCheckoutMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_AR).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCheckoutStay(null)}>إلغاء</Button>
                <Button onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  تأكيد الخروج
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EXTEND STAY DIALOG */}
      <Dialog open={!!extendStay} onOpenChange={() => setExtendStay(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تمديد الإقامة</DialogTitle>
          </DialogHeader>
          {extendStay && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                تاريخ الخروج الحالي: <span className="font-medium text-foreground">{fmtDate(extendStay.expectedCheckOut)}</span>
              </p>
              <div>
                <Label>تاريخ الخروج الجديد</Label>
                <Input type="date" value={newCheckoutDate} onChange={e => setNewCheckoutDate(e.target.value)} min={extendStay.expectedCheckOut.split('T')[0]} />
              </div>
              {newCheckoutDate && new Date(newCheckoutDate) > new Date(extendStay.expectedCheckOut) && (
                <p className="text-sm text-primary">
                  سيتم إضافة {nightsBetween(new Date(extendStay.expectedCheckOut), new Date(newCheckoutDate))} ليلة إضافية
                  ({fmt(nightsBetween(new Date(extendStay.expectedCheckOut), new Date(newCheckoutDate)) * (extendStay.room?.pricePerNight || 0))})
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setExtendStay(null)}>إلغاء</Button>
                <Button onClick={handleExtend} disabled={extendLoading}>
                  {extendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  تأكيد التمديد
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  async function loadAvailableRooms() {
    const res = await getAvailableRooms()
    setAvailableRooms(Array.isArray(res) ? res : [])
  }
}
