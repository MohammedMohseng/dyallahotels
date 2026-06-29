'use client'

import { useState, useEffect, useRef } from 'react'
import { getUsers, createUser, toggleUserActive } from '@/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, UserCog, Shield, Loader2, Users, Info } from 'lucide-react'

const ROLE_AR: Record<string, string> = { ADMIN: 'مدير', RECEPTIONIST: 'موظف استقبال', ACCOUNTANT: 'محاسب' }
const ROLE_VARIANT: Record<string, any> = { ADMIN: 'default', RECEPTIONIST: 'secondary', ACCOUNTANT: 'outline' }

export default function SettingsView() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', name: '', role: 'RECEPTIONIST', password: '' })
  const initialLoadDone = useRef<boolean | null>(null)

  // Initial data fetch
  if (initialLoadDone.current === null) {
    initialLoadDone.current = true
    getUsers().then(res => {
      setUsers(Array.isArray(res) ? res : [])
    }).catch(() => {
      toast.error('فشل تحميل المستخدمين')
    }).finally(() => {
      setLoading(false)
    })
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      setUsers(Array.isArray(res) ? res : [])
    } catch { toast.error('فشل تحميل المستخدمين') }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.username || !form.email || !form.name || !form.password) {
      toast.error('جميع الحقول مطلوبة')
      return
    }
    setFormLoading(true)
    try {
      const res = await createUser(form)
      if (res.error) { toast.error(res.error) } else {
        toast.success('تم إنشاء المستخدم بنجاح')
        setDialogOpen(false)
        setForm({ username: '', email: '', name: '', role: 'RECEPTIONIST', password: '' })
        loadUsers()
      }
    } catch { toast.error('حدث خطأ') }
    setFormLoading(false)
  }

  const handleToggle = async (id: string) => {
    try {
      const res = await toggleUserActive(id)
      if (res.error) { toast.error(res.error) } else {
        toast.success('تم تحديث حالة المستخدم')
        loadUsers()
      }
    } catch { toast.error('حدث خطأ') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5" /> معلومات النظام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">اسم النظام</p>
              <p className="font-bold text-lg">  Hotel</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">الإصدار</p>
              <p className="font-bold text-lg">1.0.0</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">قاعدة البيانات</p>
              <p className="font-bold text-lg">PostgreSql</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">الإطار</p>
              <p className="font-bold text-lg">Next.js 16</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> إدارة المستخدمين</CardTitle>
            <CardDescription>إدارة حسابات المستخدمين والصلاحيات</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" /> إضافة مستخدم</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إضافة مستخدم جديد</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>اسم المستخدم *</Label>
                  <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="مثال: ahmed" />
                </div>
                <div>
                  <Label>البريد الإلكتروني *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@hotel.com" />
                </div>
                <div>
                  <Label>الاسم الكامل *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="أحمد محمد" />
                </div>
                <div>
                  <Label>الدور *</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">مدير</SelectItem>
                      <SelectItem value="RECEPTIONIST">موظف استقبال</SelectItem>
                      <SelectItem value="ACCOUNTANT">محاسب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>كلمة المرور *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="6 أحرف على الأقل" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                  <Button onClick={handleCreate} disabled={formLoading}>
                    {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    إنشاء
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell><Badge variant={ROLE_VARIANT[u.role]}>{ROLE_AR[u.role]}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? 'default' : 'destructive'}>
                          {u.isActive ? 'نشط' : 'معطل'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(u.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleToggle(u.id)}>
                          <UserCog className="w-3 h-3" /> {u.isActive ? 'تعطيل' : 'تفعيل'}
                        </Button>
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