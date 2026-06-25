'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats, getRevenueReport } from '@/actions'
import { DollarSign, CalendarDays, BedDouble, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  dailyRevenue: number
  occupancyRate: number
  todayCheckins: number
  todayCheckouts: number
  cleaningRooms: number
  maintenanceRooms: number
  reservedRooms: number
}

interface RevenuePayment {
  id: string
  amount: number
  paymentMethod: string
  createdAt: string
  stay: {
    guest: { fullName: string }
    room: { roomNumber: string }
  }
}

interface RevenueReportData {
  payments: RevenuePayment[]
  totalRevenue: number
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'SDG' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ar-EG')

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي',
  BANK_TRANSFER: 'تحويل بنكي',
  MOBILE_PAYMENT: 'دفع موبايل',
  CARD: 'بطاقة',
}

export default function ReportsView() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('7')
  const [reportData, setReportData] = useState<RevenueReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(true)

  const [weeklyRevenue, setWeeklyRevenue] = useState<number>(0)
  const [weeklyLoading, setWeeklyLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await getDashboardStats()
      setStats(data as DashboardStats)
    } catch {
      toast.error('فشل في تحميل إحصائيات لوحة التحكم')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchWeeklyRevenue = useCallback(async () => {
    setWeeklyLoading(true)
    try {
      const data = await getRevenueReport(7)
      setWeeklyRevenue((data as RevenueReportData).totalRevenue)
    } catch {
      toast.error('فشل في تحميل إيرادات الأسبوع')
    } finally {
      setWeeklyLoading(false)
    }
  }, [])

  const fetchReport = useCallback(async (days: number) => {
    setReportLoading(true)
    try {
      const data = await getRevenueReport(days)
      setReportData(data as RevenueReportData)
    } catch {
      toast.error('فشل في تحميل تقرير الإيرادات')
    } finally {
      setReportLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchWeeklyRevenue()
  }, [fetchStats, fetchWeeklyRevenue])

  useEffect(() => {
    fetchReport(parseInt(activeTab))
  }, [activeTab, fetchReport])

  const summaryCards = [
    {
      title: 'إيرادات اليوم',
      value: stats ? formatCurrency(stats.dailyRevenue) : '—',
      icon: DollarSign,
      loading: statsLoading,
    },
    {
      title: 'إيرادات الأسبوع',
      value: weeklyLoading ? '—' : formatCurrency(weeklyRevenue),
      icon: TrendingUp,
      loading: weeklyLoading,
    },
    {
      title: 'الإقامات النشطة',
      value: stats ? String(stats.occupiedRooms) : '—',
      icon: BedDouble,
      loading: statsLoading,
    },
    {
      title: 'نسبة الإشغال',
      value: stats ? `${stats.occupancyRate}%` : '—',
      icon: CalendarDays,
      loading: statsLoading,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">التقارير</h2>
        <p className="text-muted-foreground">نظرة عامة على الإيرادات والتحليلات</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {card.loading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Revenue Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير الإيرادات</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="7">آخر 7 أيام</TabsTrigger>
              <TabsTrigger value="30">آخر 30 يوم</TabsTrigger>
              <TabsTrigger value="90">آخر 90 يوم</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {reportLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !reportData || reportData.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد مدفوعات لهذه الفترة</p>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الضيف</TableHead>
                          <TableHead>الغرفة</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>طريقة الدفع</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.createdAt)}</TableCell>
                            <TableCell className="font-medium">
                              {payment.stay?.guest?.fullName || '—'}
                            </TableCell>
                            <TableCell>
                              {payment.stay?.room?.roomNumber || '—'}
                            </TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total row */}
                  <div className="mt-4 flex items-center justify-end border-t pt-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات:</span>
                      <span className="text-xl font-bold">
                        {formatCurrency(reportData.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}