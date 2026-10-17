import { useState, useMemo, useEffect } from 'react';
import type { PhoneEntry } from '@/types/phone';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useOffices } from '@/hooks/useOffices';
import { useDepartments } from '@/hooks/useDepartments';
import { usePhoneEntries } from '@/hooks/usePhoneEntries';
import { useAccessCodes, AccessCode } from '@/hooks/useAccessCodes';
import { useOfficeLocations } from '@/hooks/useOfficeLocations';
import { useAllData } from '@/hooks/useAllData';
import { getDeviceName, getBrowserName, getLocationName, getDateTimeInfo } from '@/lib/deviceInfo';
import { Shield, Plus, Pencil, Trash2, Building2, Users, Phone, MessageCircle, ArrowLeft, ChevronRight, KeyRound, Clock, Search, Smartphone, MapPin, Calendar, Circle, Siren, X } from 'lucide-react';
import { toast } from 'sonner';
import { logEntryEdit, diffEntries } from '@/hooks/useEntryLogs';
import { isNewExtActive, isNewPhoneActive, isNewExtExpired, isNewPhoneExpired } from '@/lib/newFlags';
import { getEntryAdminRoute } from '@/lib/shiftNotifications';
import ShiftManagerDialog from '@/components/ShiftManagerDialog';
import { Sun, Moon } from 'lucide-react';

type Tab = 'access_codes' | 'offices' | 'departments' | 'entries';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isUserOnline(lastActiveStr: string | null): boolean {
  if (!lastActiveStr) return false;
  const lastActive = new Date(lastActiveStr).getTime();
  const now = Date.now();
  const diffMs = now - lastActive;
  const diffMins = Math.floor(diffMs / 60000);
  // Consider online if active within last 30 minutes
  return diffMins < 30;
}

function formatBDDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput + (dateInput.length === 10 ? 'T00:00:00+06:00' : '')) : dateInput;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('880') ? digits : `88${digits}`;
}

function buildShiftWhatsAppMessage(
  name: string,
  shift: string,
  shiftFrom: string | null | undefined,
  shiftTo: string | null | undefined,
  sender: { name: string; designation?: string | null; department?: string | null; phone?: string | null },
): string {
  const shiftLabel = shift === 'day' ? 'দিন' : 'রাত';
  const dateRange = shiftFrom && shiftTo
    ? `\n\nতারিখ: ${formatBDDate(shiftFrom)} থেকে ${formatBDDate(shiftTo)} পর্যন্ত`
    : '';
  const senderDetails = [
    `নাম: ${sender.name}`,
    sender.designation && `পদবি: ${sender.designation}`,
    sender.department && `বিভাগ: ${sender.department}`,
    sender.phone && `ফোন: ${sender.phone}`,
  ].filter(Boolean).join('\n');
  return `আসসালামু আলাইকুম ${name},\n\nআপনার ${shiftLabel} শিফট নির্ধারিত হয়েছে।${dateRange}\n\nদয়া করে আপনার নির্ধারিত সময়সূচি দেখে রাখুন। ধন্যবাদ।\n\nপ্রেরক:\n${senderDetails}`;
}

function todayBD(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function getLastActiveDay(lastActiveStr: string | null): string {
  if (!lastActiveStr) return 'Never';
  const date = new Date(lastActiveStr);

  // Convert to Bangladesh timezone (UTC+6)
  const bdTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[bdTime.getDay()];
  const monthName = months[bdTime.getMonth()];
  const dayNum = bdTime.getDate();
  const year = bdTime.getFullYear();

  const hours = String(bdTime.getHours()).padStart(2, '0');
  const minutes = String(bdTime.getMinutes()).padStart(2, '0');
  const seconds = String(bdTime.getSeconds()).padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;

  return `${dayName}, ${monthName} ${dayNum}, ${year} ${time}`;
}

function getDeviceType(deviceName: string): string {
  if (!deviceName) return '💻 Unknown Device';
  const lower = deviceName.toLowerCase();

  // Laptop detection
  if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('windows laptop') || lower.includes('mac os')) {
    return '💻 Laptop';
  }

  // Desktop detection
  if (lower.includes('desktop') || lower.includes('pc') || lower.includes('linux desktop')) {
    return '🖥️ Desktop';
  }

  // Mobile detection
  if (lower.includes('iphone') || lower.includes('android') && !lower.includes('pc') || lower.includes('mobile')) {
    return '📱 Mobile Phone';
  }

  // Tablet detection
  if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('surface')) {
    return '📱 Tablet';
  }

  // Fallback with emoji based on keywords
  if (lower.includes('windows') || lower.includes('linux')) {
    return '💻 ' + deviceName;
  }
  if (lower.includes('mac') || lower.includes('apple')) {
    return '🍎 ' + deviceName;
  }

  return '💻 ' + deviceName;
}

const Admin = () => {
  const { isAdmin, isSubAdmin, isSuperAdmin, accessCode, loading: authLoading } = useAuth();
  const canModify = (createdBy: string | null | undefined) => isSuperAdmin || (isSubAdmin && !!accessCode && createdBy === accessCode.id);
  // Scope: sub admin assigned to an office/department can only work inside it
  const scopeOfficeId = isSubAdmin ? (accessCode?.office_id || null) : null;
  const scopeDeptId = isSubAdmin ? (accessCode?.department_id || null) : null;
  const officeInScope = (officeId: string) => !scopeOfficeId || scopeOfficeId === officeId;
  const deptInScope = (deptId: string) => !scopeDeptId || scopeDeptId === deptId;
  // Sub admins can always edit entries; delete only on own. Super admin can do both.
  const canEditEntry = (_createdBy: string | null | undefined) => isSuperAdmin || isSubAdmin;
  const canDeleteEntry = (createdBy: string | null | undefined) => isSuperAdmin || (isSubAdmin && !!accessCode && createdBy === accessCode.id);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(isSubAdmin ? 'offices' : 'access_codes');

  // Sync default tab once auth finishes loading (sub admins shouldn't land on hidden access_codes tab)
  useEffect(() => {
    if (!authLoading && isSubAdmin && tab === 'access_codes') {
      setTab('offices');
    }
  }, [authLoading, isSubAdmin]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);
  const [highlightEntryName, setHighlightEntryName] = useState<string | null>(null);
  const [highlightEntryExtension, setHighlightEntryExtension] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('tab') !== 'entries') return;
    const officeId = searchParams.get('office');
    const departmentId = searchParams.get('dept');
    if (officeId) setSelectedOfficeId(officeId);
    if (departmentId) setSelectedDeptId(departmentId);
    setHighlightEntryId(searchParams.get('entry'));
    setHighlightEntryName(searchParams.get('name'));
    setHighlightEntryExtension(searchParams.get('extension'));
    setEntrySearch('');
    setEntryShiftFilter('all');
    setTab('entries');
  }, [searchParams]);

  // Search & filter for access codes
  const [codeSearch, setCodeSearch] = useState('');
  const [codeRoleFilter, setCodeRoleFilter] = useState('all');
  const [codeStatusFilter, setCodeStatusFilter] = useState('all');
  const [codeOfficeFilter, setCodeOfficeFilter] = useState('all');

  // Search & filter for departments
  const [deptSearch, setDeptSearch] = useState('');
  const [deptEntryFilter, setDeptEntryFilter] = useState('all');
  const [deptNameFilter, setDeptNameFilter] = useState('all');

  // Search & filter for offices
  const [officeDeptFilter, setOfficeDeptFilter] = useState('all');
  const [officeSearch, setOfficeSearch] = useState('');

  // Search & filter for entries
  const [entrySearch, setEntrySearch] = useState('');
  const [entryShiftFilter, setEntryShiftFilter] = useState('all');

  // Detail page navigation
  const [viewMode, setViewMode] = useState<'overview' | 'office' | 'department' | 'user'>('overview');
  const [selectedOfficeForView, setSelectedOfficeForView] = useState<string | null>(null);
  const [selectedDeptForView, setSelectedDeptForView] = useState<string | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<AccessCode | null>(null);

  const { offices, create: createOffice, update: updateOffice, remove: removeOffice } = useOffices();
  const { departments, create: createDept, update: updateDept, remove: removeDept } = useDepartments(selectedOfficeId || undefined);
  const { entries, create: createEntry, update: updateEntry, remove: removeEntry } = usePhoneEntries(selectedDeptId || undefined);
  const { codes, create: createCode, update: updateCode, remove: removeCode } = useAccessCodes();
  const { locations, create: createLocation, update: updateLocation, remove: removeLocation } = useOfficeLocations(selectedOfficeId || undefined);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState<'day' | 'night' | null>(null);
  const [locationEditId, setLocationEditId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const { offices: allOfficesWithStats, departments: allDepartments, entries: allEntries } = useAllData();
  const currentSenderName = accessCode?.label?.trim() || 'Admin';
  const currentSenderEntry = accessCode?.label
    ? allEntries.find(entry => entry.name.trim().toLowerCase() === currentSenderName.toLowerCase()
      && (!accessCode.department_id || entry.department_id === accessCode.department_id))
    : undefined;
  const senderDepartmentId = accessCode?.department_id || currentSenderEntry?.department_id;
  const shiftMessageSender = {
    name: currentSenderName,
    designation: currentSenderEntry?.designation,
    department: allDepartments.find(department => department.id === senderDepartmentId)?.name,
    phone: currentSenderEntry?.phone,
  };

  useEffect(() => {
    if (tab !== 'entries') return;
    const targetEntry = entries.find(entry => highlightEntryId
      ? entry.id === highlightEntryId
      : !!highlightEntryName
      && entry.name.trim().toLowerCase() === highlightEntryName.trim().toLowerCase()
      && (!highlightEntryExtension || entry.extension === highlightEntryExtension));
    if (!targetEntry) return;
    document.getElementById(`admin-entry-${targetEntry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightEntryId, highlightEntryName, highlightEntryExtension, entries, tab]);
  const entriesByDeptId = useMemo(() => {
    const map = new Map<string, typeof allEntries>();
    allEntries.forEach(e => {
      if (!map.has(e.department_id)) map.set(e.department_id, []);
      map.get(e.department_id)!.push(e);
    });
    return map;
  }, [allEntries]);
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [shiftDialogEntry, setShiftDialogEntry] = useState<PhoneEntry | null>(null);
  const [shiftDialogShift, setShiftDialogShift] = useState<'day' | 'night' | 'none'>('none');
  const [shiftDialogFrom, setShiftDialogFrom] = useState('');
  const [shiftDialogTo, setShiftDialogTo] = useState('');
  const [dialogType, setDialogType] = useState<'office' | 'department' | 'entry' | 'access_code'>('office');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  // Access Code Details Modal
  const [selectedAccessCode, setSelectedAccessCode] = useState<AccessCode | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'access_code' | 'office' | 'department' | 'entry' | null>(null);
  const [accessCodeDetails, setAccessCodeDetails] = useState({
    deviceName: '',
    browserName: '',
    locationName: '',
    dateTime: { time: '', date: '', day: '' },
    durationStayed: ''
  });

  // Load device info on access code selection
  useEffect(() => {
    if (selectedAccessCode) {
      const deviceName = getDeviceName();
      const browserName = getBrowserName();
      const dateTime = getDateTimeInfo();

      setAccessCodeDetails(prev => ({
        ...prev,
        deviceName,
        browserName,
        dateTime
      }));

      // Load location
      getLocationName().then(location => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: location
        }));
      }).catch(() => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: 'Location unavailable'
        }));
      });

      // Calculate duration stayed
      if (selectedAccessCode.last_active) {
        const lastActive = new Date(selectedAccessCode.last_active);
        const now = new Date();
        const diffMs = now.getTime() - lastActive.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        setAccessCodeDetails(prev => ({
          ...prev,
          durationStayed: duration
        }));
      }

      // Update time every second
      const interval = setInterval(() => {
        const newDateTime = getDateTimeInfo();
        setAccessCodeDetails(prev => ({
          ...prev,
          dateTime: newDateTime
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedAccessCode]);

  // Load device info on user detail view selection
  useEffect(() => {
    if (selectedUserForView) {
      const deviceName = getDeviceName();
      const browserName = getBrowserName();
      const dateTime = getDateTimeInfo();

      setAccessCodeDetails(prev => ({
        ...prev,
        deviceName,
        browserName,
        dateTime
      }));

      // Load location
      getLocationName().then(location => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: location
        }));
      }).catch(() => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: 'Location unavailable'
        }));
      });

      // Calculate duration stayed
      if (selectedUserForView.last_active) {
        const lastActive = new Date(selectedUserForView.last_active);
        const now = new Date();
        const diffMs = now.getTime() - lastActive.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        setAccessCodeDetails(prev => ({
          ...prev,
          durationStayed: duration
        }));
      }

      // Update time every second
      const interval = setInterval(() => {
        const newDateTime = getDateTimeInfo();
        setAccessCodeDetails(prev => ({
          ...prev,
          dateTime: newDateTime
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedUserForView]);

  // Filtered codes
  const filteredCodes = useMemo(() => {
    let result = [...codes];
    if (codeSearch.trim()) {
      const q = codeSearch.toLowerCase();
      result = result.filter(c => c.code.toLowerCase().includes(q) || (c.label || '').toLowerCase().includes(q));
    }
    if (codeRoleFilter !== 'all') result = result.filter(c => c.role === codeRoleFilter);
    if (codeStatusFilter !== 'all') result = result.filter(c => codeStatusFilter === 'active' ? c.is_active : !c.is_active);
    if (codeOfficeFilter !== 'all') result = result.filter(c => c.office_id === codeOfficeFilter);
    // Sort by online status first, then by most recent last-active time
    result.sort((a, b) => {
      const aOnline = isUserOnline(a.last_active);
      const bOnline = isUserOnline(b.last_active);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      const aTime = a.last_active ? new Date(a.last_active).getTime() : 0;
      const bTime = b.last_active ? new Date(b.last_active).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;

      const aNum = parseInt(a.code) || 0;
      const bNum = parseInt(b.code) || 0;
      return aNum - bNum;
    });
    return result;
  }, [codes, codeSearch, codeRoleFilter, codeStatusFilter, codeOfficeFilter])

  const filteredOffices = useMemo(() => {
    let list = scopeOfficeId ? offices.filter(o => o.id === scopeOfficeId) : offices;
    if (officeSearch.trim()) {
      const q = officeSearch.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q));
    }
    return list;
  }, [offices, officeSearch, scopeOfficeId]);

  // Scoped departments visible to the current admin (sub admin may be locked to one department)
  const scopedDepartments = useMemo(
    () => (scopeDeptId ? departments.filter(d => d.id === scopeDeptId) : departments),
    [departments, scopeDeptId]
  );

  // Lock a scoped sub admin into their assigned office / department
  useEffect(() => {
    if (!scopeOfficeId) return;
    if (selectedOfficeId !== scopeOfficeId) {
      setSelectedOfficeId(scopeOfficeId);
      setTab(scopeDeptId ? 'entries' : 'departments');
      if (scopeDeptId) setSelectedDeptId(scopeDeptId);
      return;
    }
    if (scopeDeptId && selectedDeptId !== scopeDeptId) {
      setSelectedDeptId(scopeDeptId);
      setTab('entries');
    }
  }, [scopeOfficeId, scopeDeptId, selectedOfficeId, selectedDeptId]);


  // Auto-uncheck New Ext / New Phone flags once their end date has passed
  useEffect(() => {
    if (!isAdmin || !allEntries.length) return;
    const expired = allEntries.filter(e => isNewExtExpired(e as any) || isNewPhoneExpired(e as any));
    if (!expired.length) return;
    expired.forEach(e => {
      const patch: Record<string, unknown> = {};
      if (isNewExtExpired(e as any)) { patch.is_new = false; patch.new_ext_to = null; patch.new_ext_from = null; patch.new_ext_date = null; }
      if (isNewPhoneExpired(e as any)) { patch.is_new_phone = false; patch.new_phone_to = null; patch.new_phone_from = null; patch.new_phone_date = null; }
      updateEntry(e.id, patch as any);
    });
  }, [allEntries, isAdmin, updateEntry]);

  // Auto-clear Day/Night shift after its end date
  useEffect(() => {
    if (!isAdmin || !allEntries.length) return;
    const today = todayBD();
    allEntries.forEach((e: any) => {
      if (e.shift && e.shift_to && today > e.shift_to) updateEntry(e.id, { shift: null, shift_from: null, shift_to: null } as any);
    });
  }, [allEntries, isAdmin, updateEntry]);

  const shiftEndingSoon = useMemo(() => {
    const t = new Date(`${todayBD()}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1);
    const tomorrow = t.toISOString().slice(0, 10);
    return allEntries.filter((e: any) => {
      if (!e.shift || e.shift_to !== tomorrow) return false;
      if (!officeInScope(e.department_id ? allDepartments.find(d => d.id === e.department_id)?.office_id || '' : '')) return false;
      return deptInScope(e.department_id);
    });
  }, [allEntries, allDepartments, officeInScope, deptInScope]);

  const handleShiftAlertClick = (entry: any) => {
    const scope = {
      office_id: accessCode?.office_id,
      department_id: accessCode?.department_id,
    };
    const route = getEntryAdminRoute(entry, allDepartments, scope);
    if (!route) return;
    navigate(route);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground mt-2">Admin Access ID required</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const openAddCode = (officeId?: string) => { setDialogType('access_code'); setEditId(null); setForm({ code: '', label: '', role: 'user', office_id: officeId || '', department_id: '', can_copy_email: 'false', can_send_email: 'false', can_print_ext: 'false', can_print_phone: 'false', can_copy_phone: 'false', can_view_location: 'false' }); setDialogOpen(true); };
  const openEditCode = (c: AccessCode) => { setDialogType('access_code'); setEditId(c.id); setForm({ code: c.code, label: c.label || '', role: c.role, is_active: c.is_active ? 'true' : 'false', office_id: c.office_id || '', department_id: c.department_id || '', can_copy_email: c.can_copy_email ? 'true' : 'false', can_send_email: c.can_send_email ? 'true' : 'false', can_print_ext: c.can_print_ext ? 'true' : 'false', can_print_phone: c.can_print_phone ? 'true' : 'false', can_copy_phone: c.can_copy_phone ? 'true' : 'false', can_view_location: c.can_view_location ? 'true' : 'false' }); setDialogOpen(true); };

  const openAddOffice = () => { setDialogType('office'); setEditId(null); setForm({ name: '', description: '' }); setDialogOpen(true); };
  const openEditOffice = (o: any) => { setDialogType('office'); setEditId(o.id); setForm({ name: o.name, description: o.description || '' }); setDialogOpen(true); };
  const openAddDept = () => { setDialogType('department'); setEditId(null); setForm({ name: '', description: '', is_emergency: 'false' }); setDialogOpen(true); };
  const openEditDept = (d: any) => { setDialogType('department'); setEditId(d.id); setForm({ name: d.name, description: d.description || '', is_emergency: d.is_emergency ? 'true' : 'false' }); setDialogOpen(true); };
  const openAddEntry = () => { setDialogType('entry'); setEditId(null); setForm({ extension: '', name: '', designation: '', phone: '', email: '', location: '', status: 'active', is_new: 'false', new_ext_from: '', new_ext_to: '', is_new_phone: 'false', new_phone_from: '', new_phone_to: '', shift: 'none' }); setDialogOpen(true); };
  const openEditEntry = (e: any) => { setDialogType('entry'); setEditId(e.id); setForm({ extension: e.extension, name: e.name, designation: e.designation || '', phone: e.phone || '', email: e.email || '', location: e.location || '', status: e.status, is_new: e.is_new ? 'true' : 'false', new_ext_from: e.new_ext_from || e.new_ext_date || '', new_ext_to: e.new_ext_to || '', is_new_phone: e.is_new_phone ? 'true' : 'false', new_phone_from: e.new_phone_from || '', new_phone_to: e.new_phone_to || '', shift: e.shift || 'none' }); setDialogOpen(true); };

  const clearCodeFilters = () => {
    setCodeSearch('');
    setCodeOfficeFilter('all');
    setCodeRoleFilter('all');
    setCodeStatusFilter('all');
  };

  const clearDeptFilters = () => {
    setDeptSearch('');
    setDeptNameFilter('all');
    setDeptEntryFilter('all');
  };

  const handleSave = async () => {
    if (dialogType === 'access_code') {
      if (!form.code?.trim()) { toast.error('Access ID দিন'); return; }
      const perms = {
        can_copy_email: form.can_copy_email === 'true',
        can_send_email: form.can_send_email === 'true',
        can_print_ext: form.can_print_ext === 'true',
        can_print_phone: form.can_print_phone === 'true',
        can_copy_phone: form.can_copy_phone === 'true',
        can_view_location: form.can_view_location === 'true',
      };
      if (editId) {
        const { error } = await updateCode(editId, { code: form.code, label: form.label || null, role: form.role as any, is_active: form.is_active !== 'false', office_id: form.office_id || null, department_id: form.department_id || null, ...perms });
        if (error) toast.error(error); else toast.success('Updated!');
      } else {
        const { error } = await createCode(form.code, form.label || '', form.role as any, form.office_id || null, form.department_id || null, perms);
        if (error) toast.error(error); else toast.success('Created!');
      }

    } else if (dialogType === 'office') {
      if (!form.name?.trim()) { toast.error('Office name দিন'); return; }
      const { error } = editId
        ? await updateOffice(editId, { name: form.name, description: form.description || null })
        : await createOffice(form.name, form.description || undefined, accessCode?.id);
      if (error) toast.error(error); else toast.success(editId ? 'Updated!' : 'Created!');
    } else if (dialogType === 'department') {
      if (!form.name?.trim()) { toast.error('Department name দিন'); return; }
      const { error } = editId
        ? await updateDept(editId, { name: form.name, description: form.description || null, is_emergency: form.is_emergency === 'true' } as any)
        : await createDept(selectedOfficeId, form.name, form.description || undefined, accessCode?.id, form.is_emergency === 'true');
      if (error) toast.error(error); else toast.success(editId ? 'Updated!' : 'Created!');
    } else {
      if (!form.name?.trim()) { toast.error('Name দিন'); return; }
      if (!deptInScope(selectedDeptId) || !officeInScope(selectedOfficeId)) { toast.error('এই department এ আপনার permission নেই'); return; }

      const isNew = form.is_new === 'true';
      const newExtFrom = isNew ? (form.new_ext_from || todayBD()) : null;
      const newExtTo = isNew ? (form.new_ext_to || null) : null;
      const isNewPhone = form.is_new_phone === 'true';
      const newPhoneFrom = isNewPhone ? (form.new_phone_from || todayBD()) : null;
      const newPhoneTo = isNewPhone ? (form.new_phone_to || null) : null;
      if (isNew && !newExtTo) { toast.error('Please select a New Ext To date'); return; }
      if (isNewPhone && !newPhoneTo) { toast.error('Please select a New Phone To date'); return; }
      if (newExtTo && newExtFrom && newExtFrom > newExtTo) { toast.error('New Ext To date must be after From date'); return; }
      if (newPhoneTo && newPhoneFrom && newPhoneFrom > newPhoneTo) { toast.error('New Phone To date must be after From date'); return; }
      const newExtDate = newExtFrom;
      const flagFields = { is_new: isNew, new_ext_date: newExtDate, new_ext_from: newExtFrom, new_ext_to: newExtTo, is_new_phone: isNewPhone, new_phone_date: newPhoneFrom, new_phone_from: newPhoneFrom, new_phone_to: newPhoneTo, shift: (form.shift && form.shift !== 'none') ? form.shift : null };
      if (editId) {
        const before = entries.find(e => e.id === editId);
        const updatedFields = { extension: form.extension, name: form.name, designation: form.designation || '', phone: form.phone || null, email: form.email || null, location: form.location || '', status: form.status, ...flagFields };
        const { error } = await updateEntry(editId, updatedFields as any);
        if (error) { toast.error(error); return; }
        toast.success('Updated!');
        if (isSubAdmin && before && accessCode) {
          const changes = diffEntries(before, { ...before, ...updatedFields });
          if (Object.keys(changes).length > 0) {
            await logEntryEdit({
              entry_id: editId,
              department_id: selectedDeptId,
              office_id: selectedOfficeId,
              editor_code_id: accessCode.id,
              editor_label: accessCode.label,
              editor_code: accessCode.code,
              action: 'update',
              changes,
              entry_snapshot: { name: updatedFields.name, extension: updatedFields.extension },
            });
          }
        }
      } else {
        const { error } = await createEntry({ department_id: selectedDeptId, extension: form.extension, name: form.name, designation: form.designation || '', phone: form.phone || undefined, email: form.email || undefined, location: form.location || '', status: form.status, ...flagFields, created_by_code_id: accessCode?.id });
        if (error) { toast.error(error); return; }
        toast.success('Created!');
        if (isSubAdmin && accessCode) {
          await logEntryEdit({
            entry_id: null,
            department_id: selectedDeptId,
            office_id: selectedOfficeId,
            editor_code_id: accessCode.id,
            editor_label: accessCode.label,
            editor_code: accessCode.code,
            action: 'create',
            changes: null,
            entry_snapshot: { name: form.name, extension: form.extension },
          });
        }
      }
    }
    setDialogOpen(false);
  };

  const openShiftDialog = (entry: PhoneEntry) => {
    if (!canEditEntry((entry as any).created_by_code_id)) return;
    const current = entry.shift?.toLowerCase();
    setShiftDialogShift(current === 'day' ? 'day' : current === 'night' ? 'night' : 'none');
    setShiftDialogFrom((entry as any).shift_from || '');
    setShiftDialogTo((entry as any).shift_to || '');
    setShiftDialogEntry(entry);
  };

  const handleSaveShift = async () => {
    const entry = shiftDialogEntry;
    if (!entry) return;
    if (shiftDialogShift !== 'none' && shiftDialogFrom && shiftDialogTo && shiftDialogTo < shiftDialogFrom) {
      toast.error('শেষ তারিখ শুরুর তারিখের আগে হতে পারবে না');
      return;
    }
    const nextShift = shiftDialogShift === 'none' ? null : shiftDialogShift;
    const { error } = await updateEntry(entry.id, nextShift
      ? { shift: nextShift, shift_from: shiftDialogFrom || todayBD(), shift_to: shiftDialogTo || null }
      : { shift: null, shift_from: null, shift_to: null } as any);
    if (error) { toast.error(error); return; }

    toast.success(nextShift ? `Shift changed to ${nextShift === 'day' ? 'Day' : 'Night'}` : 'Shift cleared');
    setShiftDialogEntry(null);
    if (isSubAdmin && accessCode) {
      await logEntryEdit({
        entry_id: entry.id,
        department_id: entry.department_id,
        office_id: selectedOfficeId,
        editor_code_id: accessCode.id,
        editor_label: accessCode.label,
        editor_code: accessCode.code,
        action: 'update',
        changes: { shift: { from: entry.shift ?? null, to: nextShift } },
        entry_snapshot: { name: entry.name, extension: entry.extension },
      });
    }
  };

  const renderEntryShift = (entry: PhoneEntry) => {
    const shift = entry.shift?.toLowerCase();
    const label = shift === 'day' ? 'Day' : shift === 'night' ? 'Night' : null;
    const badgeClassName = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${shift === 'day' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : shift === 'night' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-muted text-muted-foreground'}`;
    const dateRange = label && (entry.shift_from || entry.shift_to)
      ? entry.shift_from && entry.shift_to
        ? `${formatBDDate((entry as any).shift_from)} – ${formatBDDate(entry.shift_to)}`
        : formatBDDate((entry as any).shift_from || entry.shift_to)
      : null;

    const badge = label ? <span className={badgeClassName}>{label}</span> : <span className="text-muted-foreground text-xs">—</span>;

    if (canEditEntry((entry as any).created_by_code_id)) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <button type="button" onClick={() => openShiftDialog(entry)} className={`${badgeClassName} transition-opacity hover:opacity-80`} title="Click to change shift & dates">
            {label || 'Set shift'}
          </button>
          {dateRange && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{dateRange}</span>}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-0.5">
        {badge}
        {dateRange && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{dateRange}</span>}
      </div>
    );
  };

  const handleDelete = async (type: string, id: string) => {
    let result;
    let entrySnapshot: any = null;
    if (type === 'entry') entrySnapshot = entries.find(e => e.id === id);
    if (type === 'access_code') result = await removeCode(id);
    else if (type === 'office') result = await removeOffice(id);
    else if (type === 'department') result = await removeDept(id);
    else result = await removeEntry(id);
    if (result.error) { toast.error(result.error); return; }
    toast.success('Deleted!');
    if (type === 'entry' && isSubAdmin && accessCode && entrySnapshot) {
      await logEntryEdit({
        entry_id: id,
        department_id: selectedDeptId,
        office_id: selectedOfficeId,
        editor_code_id: accessCode.id,
        editor_label: accessCode.label,
        editor_code: accessCode.code,
        action: 'delete',
        changes: null,
        entry_snapshot: { name: entrySnapshot.name, extension: entrySnapshot.extension },
      });
    }
  };

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);
  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const officeForDetailView = selectedOfficeForView ? allOfficesWithStats.find(o => o.id === selectedOfficeForView) : null;
  const deptForDetailView = selectedDeptForView ? allDepartments.find(d => d.id === selectedDeptForView) : null;
  const currentDateBD = todayBD();
  const nextDateBD = new Date(`${currentDateBD}T00:00:00Z`);
  nextDateBD.setUTCDate(nextDateBD.getUTCDate() + 1);
  const shiftWarningDateBD = nextDateBD.toISOString().slice(0, 10);
  return (
    <div className="admin-shell min-h-screen bg-background">
      <Header />
      <main className="w-full px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
        {shiftEndingSoon.length > 0 && (
          <div className="mb-3 w-fit max-w-full rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-sm">
            <p className="font-semibold text-foreground">⏰ Shift আগামীকাল শেষ হবে ({shiftEndingSoon.length} জন)</p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-1">
              {shiftEndingSoon.map(e => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => handleShiftAlertClick(e)}
                    className="w-fit max-w-full whitespace-normal text-left rounded-md px-1.5 py-1 hover:bg-amber-200/40 dark:hover:bg-amber-500/10 transition-colors"
                  >
                    {e.name} — {e.shift === 'day' ? 'Day' : 'Night'} · {formatBDDate((e as any).shift_from)} থেকে {formatBDDate((e as any).shift_to)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Admin Panel
          </h2>
        </div>

        {/* OFFICE DETAIL VIEW */}
        {viewMode === 'office' && officeForDetailView && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setViewMode('overview'); setSelectedOfficeForView(null); }}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Overview
            </Button>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    <h2 className="text-xl sm:text-3xl font-bold text-foreground">{officeForDetailView.name}</h2>
                  </div>
                </div>
                <Button onClick={() => openAddCode(selectedOfficeForView || '')} size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-1" /> Add Access ID
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <p className="text-sm text-muted-foreground">Departments</p>
                  </div>
                  <p className="text-xl sm:text-3xl font-bold text-foreground">{officeForDetailView.departmentCount}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-muted-foreground">Extensions</p>
                  </div>
                  <p className="text-xl sm:text-3xl font-bold text-foreground">{officeForDetailView.entryCount}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-muted-foreground">Access Users</p>
                  </div>
                  <p className="text-xl sm:text-3xl font-bold text-foreground">{codes.filter(c => c.office_id === selectedOfficeForView).length}</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">Departments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDepartments.filter(d => d.office_id === selectedOfficeForView).map(dept => {
                const deptEntries = officeForDetailView.previewEntries.filter(e => e.department_id === dept.id);
                const deptUsers = codes.filter(c => c.department_id === dept.id);
                return (
                  <div
                    key={dept.id}
                    className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/50 cursor-pointer transition-all duration-200 group"
                    onClick={() => { setSelectedDeptForView(dept.id); setViewMode('department'); }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Users className="w-6 h-6 text-primary group-hover:scale-110 transition-transform flex-shrink-0" />
                      <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{dept.name}</h4>
                    </div>
                    {dept.description && <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>}
                    <div className="flex gap-2 justify-between">
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                        {deptEntries.length} extensions
                      </span>
                      <span className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full font-medium">
                        {deptUsers.length} users
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DEPARTMENT DETAIL VIEW */}
        {viewMode === 'department' && deptForDetailView && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setViewMode('office'); setSelectedDeptForView(null); }}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Office
            </Button>

            <div className="bg-card rounded-xl border border-border p-3 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    <h2 className="text-xl sm:text-3xl font-bold text-foreground">{deptForDetailView.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-11">
                    {officeForDetailView?.name || 'Office'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-muted-foreground">Access Users</p>
                  </div>
                  <p className="text-xl sm:text-3xl font-bold text-foreground">{codes.filter(c => c.department_id === selectedDeptForView).length}</p>
                </div>
              </div>

              {deptForDetailView.description && (
                <p className="text-foreground mb-4">{deptForDetailView.description}</p>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-4">Access Users</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {codes.filter(c => c.department_id === selectedDeptForView).map(code => {
                const online = isUserOnline(code.last_active);
                return (
                  <div
                    key={code.id}
                    className="bg-card rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/50 cursor-pointer transition-all duration-200 group"
                    onClick={() => { setSelectedUserForView(code); setViewMode('user'); }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <KeyRound className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                          <Circle
                            className={`w-2.5 h-2.5 absolute -top-1 -right-1 fill-current ${online ? 'text-green-500' : 'text-red-500'}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-foreground group-hover:text-primary transition-colors truncate">{code.code}</p>
                          {code.label && <p className="text-sm text-muted-foreground truncate">{code.label}</p>}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${code.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {code.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">User</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${online ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <span>Time</span>
                        <span className="font-medium text-foreground">{code.last_active ? new Date(code.last_active).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Date</span>
                        <span className="font-medium text-foreground">{code.last_active ? new Date(code.last_active).toLocaleDateString('en-GB') : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Day</span>
                        <span className="font-medium text-foreground">{code.last_active ? new Date(code.last_active).toLocaleDateString('en-US', { weekday: 'long' }) : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ACCESS USER DETAIL VIEW */}
        {viewMode === 'user' && selectedUserForView && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setViewMode(selectedDeptForView ? 'department' : 'overview'); setSelectedUserForView(null); }}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> {selectedDeptForView ? 'Back to Department' : 'Back to Overview'}
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Info */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-3 sm:p-6 lg:sticky lg:top-20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/10 p-3 rounded-lg relative">
                      <KeyRound className="w-6 h-6 text-primary" />
                      <Circle
                        className={`w-3 h-3 absolute top-1 right-1 fill-current ${isUserOnline(selectedUserForView.last_active) ? 'text-green-500' : 'text-red-500'}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Access Code</p>
                      <p className="font-mono font-bold text-lg">{selectedUserForView.code}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Circle
                          className={`w-2 h-2 fill-current ${isUserOnline(selectedUserForView.last_active) ? 'text-green-500' : 'text-red-500'}`}
                        />
                        <span className={`text-xs font-medium ${isUserOnline(selectedUserForView.last_active) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isUserOnline(selectedUserForView.last_active) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedUserForView.label && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Label</p>
                      <p className="font-medium text-foreground">{selectedUserForView.label}</p>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Role</p>
                      <p className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${selectedUserForView.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {selectedUserForView.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isUserOnline(selectedUserForView.last_active) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {isUserOnline(selectedUserForView.last_active) ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Last Active</p>
                      <p className="font-medium text-foreground">{getLastActiveDay(selectedUserForView.last_active)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditCode(selectedUserForView)}
                      className="flex-1 sm:text-sm text-base py-5 sm:py-2"
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive flex-1 sm:text-sm text-base py-5 sm:py-2"
                      onClick={() => { setDeleteConfirmId(selectedUserForView.id); setDeleteConfirmType('access_code'); }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Info */}
                <div className="bg-card rounded-xl border border-border p-3 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Assignment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUserForView.office_id ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <p className="text-xs text-muted-foreground">Office/Unit</p>
                        </div>
                        <p className="font-semibold text-foreground">{offices.find(o => o.id === selectedUserForView.office_id)?.name || 'Unknown'}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Office/Unit</p>
                        <p className="text-muted-foreground">Not assigned</p>
                      </div>
                    )}

                    {selectedUserForView.department_id ? (
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="text-xs text-muted-foreground">Department</p>
                        </div>
                        <p className="font-semibold text-foreground">{allDepartments.find(d => d.id === selectedUserForView.department_id)?.name || 'Unknown'}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Department</p>
                        <p className="text-muted-foreground">Not assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Device Info Card */}
                <div className="bg-card rounded-xl border border-border p-3 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Device Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Device Type</p>
                      </div>
                      <p className="text-foreground font-semibold">{getDeviceType(accessCodeDetails.deviceName)}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Browser</p>
                      </div>
                      <p className="text-foreground">{accessCodeDetails.browserName || 'Unknown Browser'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">Location</p>
                      </div>
                      <p className="text-foreground">{accessCodeDetails.locationName && accessCodeDetails.locationName !== 'Location unavailable' ? accessCodeDetails.locationName : 'Location access not available (enable in browser settings)'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-semibold text-green-900 dark:text-green-200">Duration</p>
                      </div>
                      <p className="text-foreground font-semibold">{accessCodeDetails.durationStayed || 'Just now'}</p>
                    </div>
                  </div>
                </div>

                {/* Session Timing Card */}
                <div className="bg-card rounded-xl border border-border p-3 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Session Timing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Session Started</p>
                      </div>
                      <p className="font-medium text-foreground">{selectedUserForView.last_active ? new Date(selectedUserForView.last_active).toLocaleTimeString() : 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(selectedUserForView.last_active)}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br rounded-lg border transition-all" style={{
                      background: isUserOnline(selectedUserForView.last_active)
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)',
                      borderColor: isUserOnline(selectedUserForView.last_active) ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)'
                    }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className={`w-5 h-5 fill-current ${isUserOnline(selectedUserForView.last_active) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                        <p className={`text-sm font-semibold ${isUserOnline(selectedUserForView.last_active) ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>Current Status</p>
                      </div>
                      <p className={`text-lg font-bold ${isUserOnline(selectedUserForView.last_active) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isUserOnline(selectedUserForView.last_active) ? '🟢 Online' : '🔴 Offline'}
                      </p>
                    </div>

                    {isUserOnline(selectedUserForView.last_active) && (
                      <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">Time Spent Today</p>
                        </div>
                        <p className="text-xl font-bold text-foreground">{accessCodeDetails.durationStayed || '0m'}</p>
                      </div>
                    )}

                    <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Last Access</p>
                      </div>
                      <p className="font-medium text-foreground">{selectedUserForView.last_active ? new Date(selectedUserForView.last_active).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW MODE - Tab navigation */}
        {(viewMode === 'overview' || dialogOpen || !!deleteConfirmId) && (
          <div className={viewMode === 'overview' ? undefined : 'hidden'}>
            <div className="flex flex-wrap gap-2 mb-6">
              {!isSubAdmin && (
                <Button variant={tab === 'access_codes' ? 'default' : 'outline'} size="sm" onClick={() => setTab('access_codes')}>
                  <KeyRound className="w-4 h-4 mr-1" /> Access IDs
                </Button>
              )}
              {tab !== 'entries' && (
                <Button variant={tab === 'offices' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('offices'); setSelectedOfficeId(''); setSelectedDeptId(''); }}>
                  <Building2 className="w-4 h-4 mr-1" /> Offices
                </Button>
              )}
              {selectedOfficeId && tab !== 'entries' && (
                <Button variant={tab === 'departments' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('departments'); setSelectedDeptId(''); }}>
                  <Users className="w-4 h-4 mr-1" /> {selectedOffice?.name}
                </Button>
              )}
              {selectedDeptId && tab !== 'entries' && (
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-1" /> {selectedDept?.name}
                </Button>
              )}
            </div>

            {/* ACCESS CODES TAB */}
            {tab === 'access_codes' && !isSubAdmin && (
              <div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold">Access IDs ({filteredCodes.length})</h3>
                  <Button onClick={() => openAddCode()} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Access ID</Button>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-4">
                  <div className="flex-1 sm:max-w-lg lg:max-w-2xl">
                    <SearchBar value={codeSearch} onChange={setCodeSearch} placeholder="Search by ID or label..." />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Select value={codeOfficeFilter} onValueChange={setCodeOfficeFilter}>
                      <SelectTrigger className="w-full sm:w-40 h-12 rounded-xl bg-card"><SelectValue placeholder="Unit/Office" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Units/Offices</SelectItem>
                        {offices.map(o => (
                          <SelectItem key={o.id} value={o.id} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={codeRoleFilter} onValueChange={setCodeRoleFilter}>
                      <SelectTrigger className="w-full sm:w-32 h-12 rounded-xl bg-card"><SelectValue placeholder="Role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Roles</SelectItem>
                        <SelectItem value="admin" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Admin</SelectItem>
                        <SelectItem value="sub_admin" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Sub Admin</SelectItem>
                        <SelectItem value="user" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={codeStatusFilter} onValueChange={setCodeStatusFilter}>
                      <SelectTrigger className="w-full sm:w-32 h-12 rounded-xl bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Status</SelectItem>
                        <SelectItem value="active" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Active</SelectItem>
                        <SelectItem value="inactive" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearCodeFilters} className="h-12 whitespace-nowrap">Clear</Button>
                </div>

                <div className="overflow-x-auto bg-card rounded-xl border border-border p-2">
                  <table className="w-max min-w-full border-collapse table-auto text-[10px] sm:text-sm [&_th]:px-2 [&_td]:px-2 [&_th]:py-2 [&_td]:py-2 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap sm:[&_th]:px-3 sm:[&_td]:px-3">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-left text-xs">
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Access ID</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Label</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Role</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Status</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Unit/Office</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Department</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Last Active</th>
                        <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCodes.map(c => {
                        const online = isUserOnline(c.last_active);
                        const officeName = c.office_id ? (offices.find(o => o.id === c.office_id)?.name || 'Unknown Office') : null;
                        const deptName = c.department_id ? (allDepartments.find(d => d.id === c.department_id)?.name || 'Unknown Dept') : null;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => { setSelectedUserForView(c); setViewMode('user'); }}
                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <td className={`border border-slate-300 dark:border-slate-700 px-3 py-2 font-mono font-semibold ${online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{c.code}</td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 truncate text-slate-900 dark:text-slate-50">{c.label || '—'}</td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"><span className={`px-2 py-0.5 rounded-full text-[11px] ${c.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{c.role}</span></td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50">{c.is_active ? 'Active' : 'Inactive'}</td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50">{officeName || '—'}</td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50">{deptName || '—'}</td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50">{c.last_active ? new Date(c.last_active).toLocaleString() : '—'}</td>
                            <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEditCode(c); }}>Edit</Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id); setDeleteConfirmType('access_code'); }}>Delete</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredCodes.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border mt-4">
                      <KeyRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{codes.length === 0 ? 'No access codes yet.' : 'No matching access codes.'}</p>
                    </div>
                  )}
                </div>

                {/* Office & Department Overview */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Office & Department Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allOfficesWithStats.map(office => {
                      const officeDepts = allDepartments.filter(d => d.office_id === office.id);
                      const isExpanded = expandedOfficeId === office.id;
                      return (
                        <div
                          key={office.id}
                          className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/50 hover:bg-card/95 transition-all duration-300 cursor-pointer group"
                          onClick={() => { setSelectedOfficeForView(office.id); setViewMode('office'); }}
                        >
                          <div
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOfficeId(isExpanded ? null : office.id);
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Building2 className="w-5 h-5 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{office.name}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                <span className="font-semibold text-foreground">{office.departmentCount}</span>
                                <span className="text-xs text-muted-foreground">Depts</span>
                              </span>
                              <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
                                <Phone className="w-3.5 h-3.5 text-primary" />
                                <span className="font-semibold text-foreground">{office.entryCount}</span>
                                <span className="text-xs text-muted-foreground">Ext</span>
                              </span>
                              <span className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg">
                                <KeyRound className="w-3.5 h-3.5 text-primary" />
                                <span className="font-semibold text-foreground">{codes.filter(c => c.office_id === office.id).length}</span>
                                <span className="text-xs text-muted-foreground">Users</span>
                              </span>
                            </div>
                            <div className="flex justify-end mt-2">
                              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </div>

                          {isExpanded && officeDepts.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border space-y-3">
                              {officeDepts.map(dept => {
                                const deptEntryCount = office.previewEntries.filter(e => e.department_id === dept.id).length;
                                const deptUserCount = codes.filter(c => c.department_id === dept.id).length;
                                const deptAccessCodes = codes.filter(c => c.department_id === dept.id);
                                return (
                                  <div key={dept.id}>
                                    {/* Department Header */}
                                    <div
                                      className="flex items-center justify-between bg-muted/50 hover:bg-muted/80 hover:border-primary/30 rounded-lg px-3 py-2 mb-2 transition-all duration-200 border border-transparent cursor-pointer group"
                                      onClick={() => { setSelectedDeptForView(dept.id); setSelectedOfficeForView(office.id); setViewMode('department'); }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
                                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{dept.name}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                          {deptEntryCount} ext
                                        </span>
                                        <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                                          {deptUserCount} users
                                        </span>
                                      </div>
                                    </div>

                                    {/* Access IDs for this Department */}
                                    {deptAccessCodes.length > 0 && (
                                      <div className="ml-2 space-y-1">
                                        {deptAccessCodes.map(accessCode => (
                                          <div
                                            key={accessCode.id}
                                            className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/20 hover:to-primary/30 hover:shadow-md hover:border-primary/50 rounded px-2 py-1.5 transition-all duration-200 cursor-pointer border border-primary/20 text-xs group"
                                            onClick={() => { setSelectedUserForView(accessCode); setSelectedOfficeForView(office.id); setSelectedDeptForView(dept.id); setViewMode('user'); }}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <div className="relative flex-shrink-0">
                                                <KeyRound className="w-3 h-3 text-primary group-hover:scale-125 transition-transform" />
                                                <Circle
                                                  className={`w-1.5 h-1.5 absolute -top-0.5 -right-0.5 fill-current ${isUserOnline(accessCode.last_active) ? 'text-green-500' : 'text-red-500'}`}
                                                />
                                              </div>
                                              <span className="font-mono font-bold text-foreground truncate group-hover:text-primary transition-colors">{accessCode.code}</span>
                                              {accessCode.label && <span className="text-muted-foreground group-hover:text-primary/70 transition-colors">({accessCode.label})</span>}
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                              <span className={`px-1 py-0.5 rounded-sm text-xs font-medium ${isUserOnline(accessCode.last_active) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {isUserOnline(accessCode.last_active) ? 'on' : 'off'}
                                              </span>
                                              <span className={`px-1.5 py-0.5 rounded-sm font-medium group-hover:shadow-sm transition-all ${accessCode.role === 'admin' ? 'bg-destructive/10 text-destructive group-hover:bg-destructive/20' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
                                                {accessCode.role}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* OFFICES TAB - Card design with 5 columns */}
            {tab === 'offices' && (
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold">All Offices/Units</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <input
                        type="text"
                        placeholder="Search offices..."
                        value={officeSearch}
                        onChange={(e) => setOfficeSearch(e.target.value)}
                        className="w-full sm:w-56 px-4 py-2 pr-16 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      {officeSearch && (
                        <button
                          type="button"
                          onClick={() => setOfficeSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-muted hover:bg-accent px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {!isSubAdmin && (<Button onClick={openAddOffice} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Office</Button>)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {filteredOffices.map(office => {
                    const officeDepts = allDepartments.filter(d => d.office_id === office.id);
                    const deptCount = officeDepts.length;
                    const officeEntries = officeDepts.flatMap(d => entriesByDeptId.get(d.id) || []);
                    const entryCount = officeEntries.length;
                    const withExtCount = officeEntries.filter(e => e.extension?.trim()).length;

                    return (
                      <div key={office.id} className="bg-card rounded-xl border-2 border-orange-300 dark:border-orange-600 hover:shadow-lg hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-200 hover:-translate-y-1 p-5 cursor-pointer group flex flex-col">
                        <div className="flex-1" onClick={() => { setSelectedOfficeId(office.id); setTab('departments'); }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <h4 className="text-base font-bold text-foreground truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{office.name}</h4>
                          </div>
                          {office.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{office.description}</p>}

                          {/* Stats */}
                          <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                              <Phone className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                              <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{withExtCount}</span>
                              <span className="text-[10px] text-slate-500">Ext</span>
                            </span>
                            <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                              <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{entryCount}</span>
                              <span className="text-[10px] text-slate-500">Emp</span>
                            </span>
                            <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                              <Users className="w-3 h-3 text-green-600 dark:text-green-400" />
                              <span className="font-semibold text-slate-900 dark:text-slate-50 truncate text-xs">{deptCount}</span>
                              <span className="text-[10px] text-slate-500">Depts</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700 flex-wrap gap-2">
                          <div className="flex gap-1">
                            {isSubAdmin && (
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditOffice(office); }}><Pencil className="w-4 h-4" /></Button>
                            )}
                            {canModify((office as any).created_by_code_id) && (
                              <>
                                {!isSubAdmin && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditOffice(office); }}><Pencil className="w-4 h-4" /></Button>}
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(office.id); setDeleteConfirmType('office'); }}><Trash2 className="w-4 h-4" /></Button>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredOffices.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{officeSearch ? 'No matching offices found.' : 'No offices yet. Add your first office!'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DEPARTMENTS TAB - Card design with search and filter */}
            {tab === 'departments' && selectedOfficeId && (
              <div>
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      {!scopeOfficeId && (
                        <Button variant="ghost" size="sm" onClick={() => { setTab('offices'); setSelectedOfficeId(''); setDeptSearch(''); setDeptEntryFilter('all'); }} className="mb-2">
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Offices
                        </Button>
                      )}
                      <h3 className="text-lg font-semibold">{selectedOffice?.name} — Departments</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {!scopeDeptId && <Button onClick={openAddDept} size="sm" className="flex-1 sm:flex-none"><Plus className="w-4 h-4 mr-1" /> Add Department</Button>}

                      <Button onClick={() => { setLocationEditId(null); setLocationName(''); setLocationDialogOpen(true); }} size="sm" variant="outline" className="flex-1 sm:flex-none"><MapPin className="w-4 h-4 mr-1" /> Locations</Button>
                    </div>
                  </div>

                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Search departments by name..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={deptNameFilter}
                      onChange={(e) => setDeptNameFilter(e.target.value)}
                      className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
                    >
                      <option value="all">All Department Names</option>
                      {scopedDepartments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <select
                      value={deptEntryFilter}
                      onChange={(e) => setDeptEntryFilter(e.target.value)}
                      className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All</option>
                      <option value="with-entries">With Entries</option>
                      <option value="empty">Empty</option>
                    </select>
                    <Button variant="ghost" size="sm" onClick={clearDeptFilters} className="min-w-[120px]">Clear</Button>
                  </div>
                </div>

                {/* Departments Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {(() => {
                    const filtered = scopedDepartments.filter(dept => {
                      const deptEntries = entriesByDeptId.get(dept.id) || [];
                      const matchesSearch = deptSearch === '' || dept.name.toLowerCase().includes(deptSearch.toLowerCase());
                      const matchesNameFilter = deptNameFilter === 'all' || dept.id === deptNameFilter;
                      const hasEntries = deptEntries.length > 0;
                      const matchesFilter = deptEntryFilter === 'all' ||
                        (deptEntryFilter === 'with-entries' && hasEntries) ||
                        (deptEntryFilter === 'empty' && !hasEntries);
                      return matchesSearch && matchesNameFilter && matchesFilter;
                    });

                    return filtered.map(dept => {
                      const deptEntries = entriesByDeptId.get(dept.id) || [];
                      const entryCount = deptEntries.length;
                      const withExtCount = deptEntries.filter(e => e.extension?.trim()).length;

                      return (
                        <div
                          key={dept.id}
                          className="bg-card rounded-xl border-2 border-orange-300 dark:border-orange-600 hover:shadow-lg hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-200 hover:-translate-y-1 p-5 cursor-pointer group flex flex-col"
                        >
                          <div className="flex-1" onClick={() => { setSelectedDeptId(dept.id); setTab('entries'); }}>
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <h4 className="text-base font-bold text-foreground truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{dept.name}</h4>
                            </div>
                            {dept.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{dept.description}</p>}

                            {/* Stats */}
                            <div className="flex items-center gap-2 mb-4">
                              <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                                <Phone className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{withExtCount}</span>
                                <span className="text-[10px] text-slate-500">Ext</span>
                              </span>
                              <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-slate-900 dark:text-slate-50 text-xs">{entryCount}</span>
                                <span className="text-[10px] text-slate-500">Emp</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex gap-1">
                              {isSubAdmin && (
                                <Button variant="ghost" size="sm" onClick={() => openEditDept(dept)}><Pencil className="w-4 h-4" /></Button>
                              )}
                              {canModify((dept as any).created_by_code_id) && (
                                <>
                                  {!isSubAdmin && <Button variant="ghost" size="sm" onClick={() => openEditDept(dept)}><Pencil className="w-4 h-4" /></Button>}
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeleteConfirmId(dept.id); setDeleteConfirmType('department'); }}><Trash2 className="w-4 h-4" /></Button>
                                </>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {(() => {
                    const filtered = scopedDepartments.filter(dept => {
                      const deptEntries = entriesByDeptId.get(dept.id) || [];
                      const matchesSearch = deptSearch === '' || dept.name.toLowerCase().includes(deptSearch.toLowerCase());
                      const matchesNameFilter = deptNameFilter === 'all' || dept.id === deptNameFilter;
                      const hasEntries = deptEntries.length > 0;
                      const matchesFilter = deptEntryFilter === 'all' ||
                        (deptEntryFilter === 'with-entries' && hasEntries) ||
                        (deptEntryFilter === 'empty' && !hasEntries);
                      return matchesSearch && matchesNameFilter && matchesFilter;
                    });
                    return filtered.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No departments found.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ENTRIES TAB */}
            {tab === 'entries' && selectedDeptId && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    {!scopeDeptId && (
                      <Button variant="ghost" size="sm" onClick={() => { setTab('departments'); setSelectedDeptId(''); }} className="mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Departments
                      </Button>
                    )}

                    <h3 className="text-lg font-semibold">{selectedOffice?.name} — {selectedDept?.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button onClick={() => setShiftMode('day')} size="sm" variant="outline" className="flex-1 sm:flex-none"><Sun className="w-4 h-4 mr-1 text-amber-500" /> Day</Button>
                    <Button onClick={() => setShiftMode('night')} size="sm" variant="outline" className="flex-1 sm:flex-none"><Moon className="w-4 h-4 mr-1 text-indigo-500" /> Night</Button>
                    <Button onClick={openAddEntry} size="sm" className="flex-1 sm:flex-none"><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
                  </div>
                </div>
                <ShiftManagerDialog mode={shiftMode} onClose={() => setShiftMode(null)} entries={entries} onUpdate={(id, patch) => updateEntry(id, patch)} />

                {/* Search and Filter Controls */}
                <div className="flex flex-row flex-nowrap items-center gap-2 mb-4">
                  <div className="min-w-0 flex-1 sm:flex-none sm:w-80">
                    <input
                      type="text"
                      placeholder="Search by name, extension, phone..."
                      value={entrySearch}
                      onChange={(e) => setEntrySearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <select
                    value={entryShiftFilter}
                    onChange={(e) => setEntryShiftFilter(e.target.value)}
                    className="w-28 shrink-0 sm:w-auto px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Shifts</option>
                    <option value="day">Day</option>
                    <option value="night">Night</option>
                  </select>
                  {(entrySearch.trim() !== '' || entryShiftFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => { setEntrySearch(''); setEntryShiftFilter('all'); }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground transition-colors hover:bg-accent"
                      title="Clear filters"
                      aria-label="Clear filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-max min-w-full table-auto text-[9px] sm:text-sm border-collapse [&_th]:px-1 [&_td]:px-1 [&_th]:py-1.5 [&_td]:py-1.5 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap sm:[&_th]:px-4 sm:[&_td]:px-4 sm:[&_th]:py-3 sm:[&_td]:py-3">
                      <thead>
                        <tr className="header-gradient text-primary-foreground">
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30">Ext.</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30">Name</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30 sm:hidden">Shift</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30 hidden sm:table-cell">Shift</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30">Phone</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30">Email</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30">New Ext</th>
                          <th className="px-4 py-3 text-left font-semibold border-r border-primary-foreground/30">New Phone</th>
                          <th className="px-4 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.filter(entry => {
                          const matchesSearch = entrySearch === '' ||
                            entry.name.toLowerCase().includes(entrySearch.toLowerCase()) ||
                            entry.extension?.toLowerCase().includes(entrySearch.toLowerCase()) ||
                            entry.phone?.toLowerCase().includes(entrySearch.toLowerCase());
                          const matchesShift = entryShiftFilter === 'all' || entry.shift?.toLowerCase() === entryShiftFilter;
                          return matchesSearch && matchesShift;
                        }).map((entry, idx) => (
                          <tr id={`admin-entry-${entry.id}`} key={entry.id} className={`border-b border-border/60 transition-colors ${highlightEntryId === entry.id || (!highlightEntryId && !!highlightEntryName && entry.name.trim().toLowerCase() === highlightEntryName.trim().toLowerCase() && (!highlightEntryExtension || entry.extension === highlightEntryExtension)) ? 'outline outline-2 outline-primary outline-offset-[-2px]' : ''} ${entry.shift && entry.shift_to === currentDateBD ? 'bg-red-100 hover:bg-red-200 dark:bg-red-950/50 dark:hover:bg-red-950/70' : entry.shift && entry.shift_to === shiftWarningDateBD ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950/60' : idx % 2 === 0 ? 'bg-muted/40 hover:bg-muted/70' : 'bg-background hover:bg-muted/50'}`}>
                            <td className="px-4 py-3 text-extension font-bold border-r border-border/70 hover:border-border/100 transition-colors">{entry.extension}</td>
                            <td className="px-4 py-3 border-r border-border/70 hover:border-border/100 transition-colors">
                              <div className="font-medium whitespace-normal">{entry.name}</div>
                              {entry.designation && <div className="mt-0.5 text-xs text-muted-foreground whitespace-normal">{entry.designation}</div>}
                            </td>
                            <td className="px-4 py-3 border-r border-border/70 hover:border-border/100 transition-colors sm:hidden">{renderEntryShift(entry)}</td>
                            <td className="px-4 py-3 border-r border-border/70 hover:border-border/100 transition-colors hidden sm:table-cell">{renderEntryShift(entry)}</td>
                            <td className="px-4 py-3 text-muted-foreground border-r border-border/70 hover:border-border/100 transition-colors">
                              {entry.phone ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span>{entry.phone}</span>
                                  {(entry.shift?.toLowerCase() === 'day' || entry.shift?.toLowerCase() === 'night') && (
                                    <div className="flex items-center gap-2 sm:gap-4">
                                      <a
                                        href={`https://wa.me/${formatPhoneForWhatsApp(entry.phone)}?text=${encodeURIComponent(buildShiftWhatsAppMessage(entry.name, entry.shift.toLowerCase(), entry.shift_from, entry.shift_to, shiftMessageSender))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                                        title="WhatsApp with shift message"
                                        aria-label={`WhatsApp ${entry.name} about their shift`}
                                      >
                                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </a>
                                      <a
                                        href={`tel:${entry.phone.replace(/[^\d+]/g, '')}`}
                                        className="inline-flex p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                        title="Call"
                                        aria-label={`Call ${entry.name}`}
                                      >
                                        <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground border-r border-border/70 hover:border-border/100 transition-colors text-xs">{entry.email || '—'}</td>
                            <td className="px-4 py-3 border-r border-border/70 hover:border-border/100 transition-colors">
                              {isNewExtActive(entry as any) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                                  <Calendar className="w-3 h-3" />
                                  {formatBDDate(entry.new_ext_from || entry.new_ext_date)}{entry.new_ext_to ? ` – ${formatBDDate(entry.new_ext_to)}` : ''}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 border-r border-border/70 hover:border-border/100 transition-colors">
                              {isNewPhoneActive(entry as any) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  <Calendar className="w-3 h-3" />
                                  {formatBDDate(entry.new_phone_from || entry.new_phone_date)}{entry.new_phone_to ? ` – ${formatBDDate(entry.new_phone_to)}` : ''}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {canEditEntry((entry as any).created_by_code_id) && (
                                  <Button variant="ghost" size="sm" onClick={() => openEditEntry(entry)}><Pencil className="w-4 h-4" /></Button>
                                )}
                                {canDeleteEntry((entry as any).created_by_code_id) && (
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeleteConfirmId(entry.id); setDeleteConfirmType('entry'); }}><Trash2 className="w-4 h-4" /></Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {entries.filter(entry => {
                    const matchesSearch = entrySearch === '' ||
                      entry.name.toLowerCase().includes(entrySearch.toLowerCase()) ||
                      entry.extension?.toLowerCase().includes(entrySearch.toLowerCase()) ||
                      entry.phone?.toLowerCase().includes(entrySearch.toLowerCase());
                    const matchesShift = entryShiftFilter === 'all' || entry.shift?.toLowerCase() === entryShiftFilter;
                    return matchesSearch && matchesShift;
                  }).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{entries.length === 0 ? 'No entries yet. Add your first entry!' : 'No entries match your filters'}</p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* DIALOG */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-md z-50">
                <DialogHeader>
                  <DialogTitle>
                    {editId ? 'Edit' : 'Add'} {dialogType === 'access_code' ? 'Access ID' : dialogType === 'office' ? 'Office/Unit' : dialogType === 'department' ? 'Department' : 'Entry'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {dialogType === 'access_code' ? (
                    <>
                      <div>
                        <Label>Access ID *</Label>
                        <Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 12345" className="mt-1" />
                      </div>
                      <div>
                        <Label>Label</Label>
                        <Input value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. User Name" className="mt-1" />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select value={form.role || 'user'} onValueChange={v => setForm({ ...form, role: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">User</SelectItem>
                            <SelectItem value="sub_admin" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Sub Admin</SelectItem>
                            <SelectItem value="admin" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Unit/Office</Label>
                        <Select value={form.office_id || 'none'} onValueChange={v => setForm({ ...form, office_id: v === 'none' ? '' : v, department_id: '' })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select Office" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Unit/Office (full access)</SelectItem>
                            {offices.map(o => <SelectItem key={o.id} value={o.id} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">{o.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.office_id && (
                        <div>
                          <Label>Department</Label>
                          <Select value={form.department_id || 'none'} onValueChange={v => setForm({ ...form, department_id: v === 'none' ? '' : v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select Department" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">All Departments of this office</SelectItem>
                              {allDepartments.filter(d => d.office_id === form.office_id).map(d => <SelectItem key={d.id} value={d.id} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="rounded-lg border border-border p-3">
                        <Label className="text-xs font-semibold">Permissions</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {([
                            ['can_copy_email', 'Copy Email'],
                            ['can_send_email', 'Send Email'],
                            ['can_print_ext', 'Ext Print'],
                            ['can_print_phone', 'Phone Print'],
                            ['can_copy_phone', 'Copy Phone'],
                            ['can_view_location', 'Location'],
                          ] as const).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={form[key] === 'true'}
                                onChange={e => setForm({ ...form, [key]: e.target.checked ? 'true' : 'false' })}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">Admin role always has all permissions.</p>
                      </div>
                      {editId && (

                        <div>
                          <Label>Status</Label>
                          <Select value={form.is_active || 'true'} onValueChange={v => setForm({ ...form, is_active: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Active</SelectItem>
                              <SelectItem value="false" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  ) : dialogType === 'entry' ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="extension-number">Extension</Label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              id="is-new-ext"
                              type="checkbox"
                              className="h-4 w-4 accent-cyan-600"
                              checked={form.is_new === 'true'}
                              onChange={e => setForm({
                                ...form,
                                is_new: e.target.checked ? 'true' : 'false',
                                new_ext_from: e.target.checked ? (form.new_ext_from || todayBD()) : '',
                                new_ext_to: e.target.checked ? form.new_ext_to : '',
                              })}
                            />
                            <span>New Ext</span>
                          </label>
                        </div>
                        <Input id="extension-number" value={form.extension || ''} onChange={e => setForm({ ...form, extension: e.target.value })} placeholder="e.g. 501" className="mt-1" />
                        {form.is_new === 'true' && (
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-cyan-200 dark:border-cyan-800 p-2">
                            <div>
                              <Label className="text-[11px]">From date</Label>
                              <Input type="date" className="mt-1 h-8 text-xs" value={form.new_ext_from || ''} onChange={e => setForm({ ...form, new_ext_from: e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-[11px]">To date</Label>
                              <Input type="date" className="mt-1 h-8 text-xs" value={form.new_ext_to || ''} onChange={e => setForm({ ...form, new_ext_to: e.target.value })} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>Name *</Label>
                        <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-1" />
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <Input value={form.designation || ''} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Manager" className="mt-1" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="phone-number">Phone Number</Label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              id="is-new-phone"
                              type="checkbox"
                              className="h-4 w-4 accent-emerald-600"
                              checked={form.is_new_phone === 'true'}
                              onChange={e => setForm({
                                ...form,
                                is_new_phone: e.target.checked ? 'true' : 'false',
                                new_phone_from: e.target.checked ? (form.new_phone_from || todayBD()) : '',
                                new_phone_to: e.target.checked ? form.new_phone_to : '',
                              })}
                            />
                            <span>New Phone</span>
                          </label>
                        </div>
                        <Input id="phone-number" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +880..." className="mt-1" />
                        {form.is_new_phone === 'true' && (
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 p-2">
                            <div>
                              <Label className="text-[11px]">From date</Label>
                              <Input type="date" className="mt-1 h-8 text-xs" value={form.new_phone_from || ''} onChange={e => setForm({ ...form, new_phone_from: e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-[11px]">To date</Label>
                              <Input type="date" className="mt-1 h-8 text-xs" value={form.new_phone_to || ''} onChange={e => setForm({ ...form, new_phone_to: e.target.value })} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="mt-1" />
                      </div>
                      <div>
                        <Label>Location</Label>
                        {locations.length > 0 ? (
                          <Select value={form.location || 'none'} onValueChange={v => setForm({ ...form, location: v === 'none' ? '' : v })}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">No location</SelectItem>
                              {locations.map(l => (
                                <SelectItem key={l.id} value={l.name} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">{l.name}</SelectItem>
                              ))}
                              {form.location && !locations.some(l => l.name === form.location) && (
                                <SelectItem value={form.location} className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md">{form.location}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Add locations first (Locations button)" className="mt-1" />
                        )}
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Active</SelectItem>
                            <SelectItem value="inactive" className="border border-slate-200 dark:border-slate-700 mb-1 rounded-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Name *</Label>
                        <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={dialogType === 'office' ? 'e.g. MNR Group Head Office' : 'e.g. HR & Admin'} className="mt-1" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="mt-1" />
                      </div>
                      {dialogType === 'department' && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-red-200 dark:border-red-800 p-2">
                          <input
                            id="is-emergency"
                            type="checkbox"
                            className="h-4 w-4 accent-red-600"
                            checked={form.is_emergency === 'true'}
                            onChange={e => setForm({ ...form, is_emergency: e.target.checked ? 'true' : 'false' })}
                          />
                          <span className="flex items-center gap-1"><Siren className="w-4 h-4 text-red-600" /> Emergency Department</span>
                        </label>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave}>{editId ? 'Update' : 'Add'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* LOCATIONS MANAGER */}
            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
              <DialogContent className="sm:max-w-md z-50">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Locations — {selectedOffice?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="e.g. Level 3, Block B"
                      onKeyDown={async e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('save-location-btn')?.click(); } }}
                    />
                    <Button
                      id="save-location-btn"
                      onClick={async () => {
                        const name = locationName.trim();
                        if (!name) { toast.error('Location name দিন'); return; }
                        const { error } = locationEditId
                          ? await updateLocation(locationEditId, name)
                          : await createLocation(selectedOfficeId, name, accessCode?.id);
                        if (error) { toast.error(error); return; }
                        toast.success(locationEditId ? 'Updated!' : 'Added!');
                        setLocationEditId(null);
                        setLocationName('');
                      }}
                    >
                      {locationEditId ? 'Update' : 'Add'}
                    </Button>
                    {locationEditId && (
                      <Button variant="ghost" onClick={() => { setLocationEditId(null); setLocationName(''); }}>Cancel</Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {locations.map(l => (
                      <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                        <span className="text-sm text-foreground truncate">{l.name}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setLocationEditId(l.id); setLocationName(l.name); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={async () => {
                              const { error } = await removeLocation(l.id);
                              if (error) toast.error(error); else toast.success('Deleted!');
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {locations.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">No locations yet.</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Access Code Details Modal */}
            <Dialog open={!!selectedAccessCode} onOpenChange={(open) => !open && setSelectedAccessCode(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-primary" />
                    Access ID Details
                  </DialogTitle>
                </DialogHeader>
                {selectedAccessCode && (
                  <div className="space-y-4">
                    {/* Access Code Info */}
                    <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Access Code</p>
                      <p className="font-mono font-bold text-lg text-foreground">{selectedAccessCode.code}</p>
                      {selectedAccessCode.label && <p className="text-sm text-muted-foreground mt-2">{selectedAccessCode.label}</p>}
                    </div>

                    {/* Device Info Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Device Information</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Device:</span>
                            <span className="font-medium">{accessCodeDetails.deviceName || 'Loading...'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Browser:</span>
                            <span className="font-medium">{accessCodeDetails.browserName || 'Loading...'}</span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-muted-foreground">Location:</span>
                            <span className="font-medium text-right">{accessCodeDetails.locationName || 'Loading...'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Date & Time Card */}
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Current Date & Time</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{accessCodeDetails.dateTime.time}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{accessCodeDetails.dateTime.date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Day:</span>
                            <span className="font-medium">{accessCodeDetails.dateTime.day}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duration & Access Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-green-500/20 p-2 rounded-lg">
                            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-200">Duration Stayed</p>
                        </div>
                        <p className="text-lg font-bold text-green-600 dark:text-green-300">{accessCodeDetails.durationStayed || 'Just now'}</p>
                        <p className="text-xs text-muted-foreground mt-2">Last active: {timeAgo(selectedAccessCode.last_active)}</p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-2">Access Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Role</p>
                            <p className="font-semibold capitalize">{selectedAccessCode.role}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-semibold">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${selectedAccessCode.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                {selectedAccessCode.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
              <DialogContent className="z-50">
                <DialogHeader>
                  <DialogTitle>Confirm Delete</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {deleteConfirmType === 'access_code' && (
                    <>
                      <p className="text-foreground mb-4">
                        Are you sure you want to delete this access code? This action cannot be undone.
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Access Code</p>
                        <p className="font-mono font-bold text-lg">{selectedUserForView?.code}</p>
                      </div>
                    </>
                  )}
                  {deleteConfirmType === 'office' && (
                    <>
                      <p className="text-foreground mb-4">
                        Are you sure you want to delete this office? All associated departments and data will be removed. This action cannot be undone.
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Office</p>
                        <p className="font-bold text-lg">{offices.find(o => o.id === deleteConfirmId)?.name || 'Unknown'}</p>
                      </div>
                    </>
                  )}
                  {deleteConfirmType === 'department' && (
                    <>
                      <p className="text-foreground mb-4">
                        Are you sure you want to delete this department? All associated access codes will be removed. This action cannot be undone.
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Department</p>
                        <p className="font-bold text-lg">{departments.find(d => d.id === deleteConfirmId)?.name || 'Unknown'}</p>
                      </div>
                    </>
                  )}
                  {deleteConfirmType === 'entry' && (
                    <>
                      <p className="text-foreground mb-4">
                        Are you sure you want to delete this phone entry? This action cannot be undone.
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Phone Entry</p>
                        <p className="font-bold text-lg">{entries.find(p => p.id === deleteConfirmId)?.name || 'Unknown'}</p>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmType(null); }}>Cancel</Button>
                  <Button
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      if (deleteConfirmId && deleteConfirmType) {
                        await handleDelete(deleteConfirmType, deleteConfirmId);
                        setDeleteConfirmId(null);
                        setDeleteConfirmType(null);
                        if (deleteConfirmType === 'access_code') {
                          setViewMode('department');
                          setSelectedUserForView(null);
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={!!shiftDialogEntry} onOpenChange={(open) => !open && setShiftDialogEntry(null)}>
              <DialogContent className="sm:max-w-sm z-50">
                <DialogHeader>
                  <DialogTitle>Shift — {shiftDialogEntry?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex gap-2">
                    {(['day', 'night', 'none'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setShiftDialogShift(s)}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${shiftDialogShift === s
                          ? s === 'day'
                            ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300'
                            : s === 'night'
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300'
                              : 'bg-muted text-foreground border-border'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
                          }`}
                      >
                        {s === 'day' ? 'Day' : s === 'night' ? 'Night' : 'Clear'}
                      </button>
                    ))}
                  </div>
                  {shiftDialogShift !== 'none' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">From date</label>
                        <Input type="date" value={shiftDialogFrom} onChange={(e) => setShiftDialogFrom(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">To date</label>
                        <Input type="date" value={shiftDialogTo} onChange={(e) => setShiftDialogTo(e.target.value)} />
                      </div>
                    </div>
                  )}
                  {shiftDialogShift !== 'none' && shiftDialogFrom && shiftDialogTo && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✅ Ready: {formatBDDate(shiftDialogFrom)} থেকে {formatBDDate(shiftDialogTo)} পর্যন্ত {shiftDialogShift === 'day' ? 'Day' : 'Night'} shift
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShiftDialogEntry(null)}>Cancel</Button>
                  <Button onClick={handleSaveShift}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
