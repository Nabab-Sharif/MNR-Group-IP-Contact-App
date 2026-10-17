import { Tables } from '@/integrations/supabase/types';

export type Office = Tables<'offices'>;
export type Department = Tables<'departments'>;
export type PhoneEntry = Tables<'phone_entries'>;
export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;

export interface DepartmentWithEntries extends Department {
  phone_entries: PhoneEntry[];
}

export interface OfficeWithDepartments extends Office {
  departments: DepartmentWithEntries[];
}
