"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { getDashboardStats, getRevenueReport } from "@/actions";
import { DollarSign, CalendarDays, BedDouble, TrendingUp } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  dailyRevenue: number;
  occupancyRate: number;
  todayCheckins: number;
  todayCheckouts: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  reservedRooms: number;
}

interface RevenuePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  stay: {
    guest: { fullName: string };
    room: { roomNumber: string };
  };
}

interface RevenueReportData {
  payments: RevenuePayment[];
  totalRevenue: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقدي",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_PAYMENT: "دفع موبايل",
  CARD: "بطاقة",
};

export default function ReportsView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("7");
  const [reportData, setReportData] = useState<RevenueReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const [weeklyRevenue, setWeeklyRevenue] = useState<number>(0);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data as DashboardStats);
    } catch {
      toast.error("فشل في تحميل إحصائيات لوحة التحكم");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchWeeklyRevenue = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const data = await getRevenueReport(7);
      setWeeklyRevenue((data as RevenueReportData).totalRevenue);
    } catch {
      toast.error("فشل في تحميل إيرادات الأسبوع");
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (days: number) => {
    setReportLoading(true);
    try {
      const data = await getRevenueReport(days);
      setReportData(data as RevenueReportData);
    } catch {
      toast.error("فشل في تحميل تقرير الإيرادات");
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchStats();
      await fetchWeeklyRevenue();
    };
    loadData();
  }, [fetchStats, fetchWeeklyRevenue]);

  useEffect(() => {
    const loadData = async () => {
      await fetchReport(parseInt(activeTab));
    };
    loadData();
  }, [activeTab, fetchReport]);

  const summaryCards = [
    {
      title: "إيرادات اليوم",
      value: stats ? formatCurrency(stats.dailyRevenue) : "—",
      icon: DollarSign,
      loading: statsLoading,
    },
    {
      title: "إيرادات الأسبوع",
      value: weeklyLoading ? "—" : formatCurrency(weeklyRevenue),
      icon: TrendingUp,
      loading: weeklyLoading,
    },
    {
      title: "الإقامات النشطة",
      value: stats ? String(stats.occupiedRooms) : "—",
      icon: BedDouble,
      loading: statsLoading,
    },
    {
      title: "نسبة الإشغال",
      value: stats ? `${stats.occupancyRate}%` : "—",
      icon: CalendarDays,
      loading: statsLoading,
    },
  ];

  const excel = () => {
    if (!reportData) return;

    const formattedDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

    // تحضير البيانات لملف Excel (عناوين الأعمدة متناسقة)
    const excelData = reportData.payments.map((payment, index) => ({
      الرقم: index + 1,
      "تاريخ الإنشاء": payment.createdAt
        ? new Date(payment.createdAt).toLocaleDateString("ar-EG")
        : "-",
      الضيف: payment.stay?.guest?.fullName || "-",
      الغرفة: payment.stay?.room?.roomNumber || "-",
      المبلغ: payment.amount || "-",
      "طريقة الدفع": PAYMENT_METHOD_LABELS[payment.paymentMethod] ||  "-",
    }));

    // إنشاء ورقة العمل (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // ضبط اتجاه ورقة العمل ليكون من اليمين إلى اليسار (RTL)
    worksheet["!dir"] = "ltr";

    // إنشاء كتاب العمل (Workbook) وإضافة الورقة إليه
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الضيوف");

    // تحميل ملف الـ Excel فوراً
    XLSX.writeFile(workbook, `Payments_Report_${formattedDate}.xlsx`);
  };

  const pdf = () => {
    const formattedDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

    const tableRows = reportData?.payments
      .map(
        (payment, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${payment.createdAt || "_"}</td>
          <td dir="ltr">${payment.stay?.guest?.fullName || "-"}</td>
          <td>${payment.stay?.room?.roomNumber || "-"}</td>
          <td>${payment.amount || "—"}</td>
          <td>${PAYMENT_METHOD_LABELS[payment.paymentMethod] || "—"}</td>
        </tr>
      `,
      )
      .join("");

    const printHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>payments Report - ${formattedDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap');
            
            body {
              font-family: 'Cairo', sans-serif;
              margin: 20mm 15mm;
              color: #333;
              background-color: #fff;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 15px;
            }
            
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1e3a8a;
            }
            
            .header .meta {
              font-size: 14px;
              color: #666;
              margin-top: 5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 13px;
            }
            
            th {
              background-color: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              padding: 12px 10px;
              border: 1px solid #cbd5e1;
              text-align: center;
            }
            
            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            
            .footer-summary {
              float: left;
              background-color: #eff6ff;
              border: 1px solid #bfdbfe;
              padding: 10px 20px;
              border-radius: 6px;
              font-weight: bold;
              color: #1e40af;
              font-size: 15px;
            }
    
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير الدفعيات </h1>
            <div class="meta">تاريخ التقرير: ${formattedDate} | إجمالي المدخلات: ${tableRows?.length}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 15%;">التاريخ</th>
                <th style="width: 15%;">الضيف</th>
                <th style="width: 30%;">الغرفة</th>
                <th style="width: 20%;">المبلغ</th>
                <th style="width: 15%;">طريقة الدفع</th>
              </tr>
  
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer-summary">
            إجمالي المدفوعات : ${formatCurrency(reportData ? reportData.totalRevenue : 0)}
          </div>
        </body>
        </html>
      `;

    // فتح نافذة الطباعة وضخ التصميم الأنيق بها
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();

      // الانتظار قليلاً لضمان تحميل الخطوط (Cairo Font) ثم فتح أمر الطباعة/الحفظ كـ PDF
      printWindow.setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">التقارير</h2>
        <p className="text-muted-foreground">
          نظرة عامة على الإيرادات والتحليلات
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
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
          );
        })}
      </div>

      {/* Revenue Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير الإيرادات</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between">
              <TabsList>
                <TabsTrigger value="7">آخر 7 أيام</TabsTrigger>
                <TabsTrigger value="30">آخر 30 يوم</TabsTrigger>
                <TabsTrigger value="90">آخر 90 يوم</TabsTrigger>
              </TabsList>
              <div className="flex gap-3">
              <Button variant="default" className="!mx-0" onClick={excel}>
                تصدير للإكسيل
              </Button>
              <Button variant="default" className="!mx-0" onClick={pdf}>
                PDF
              </Button>
              </div>
            </div>
            <div className="mt-4">
              {reportLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !reportData || reportData.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد مدفوعات لهذه الفترة
                </p>
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
                            <TableCell>
                              {formatDate(payment.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.stay?.guest?.fullName || "—"}
                            </TableCell>
                            <TableCell>
                              {payment.stay?.room?.roomNumber || "—"}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {PAYMENT_METHOD_LABELS[payment.paymentMethod] ||
                                  payment.paymentMethod}
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
                      <span className="text-sm font-medium text-muted-foreground">
                        إجمالي الإيرادات:
                      </span>
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
  );
}
