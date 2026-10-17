export interface ShiftNotificationEntry {
    id?: string | null;
    department_id?: string | null;
    office_id?: string | null;
    name?: string | null;
    extension?: string | null;
}

export interface ShiftNotificationScope {
    office_id?: string | null;
    department_id?: string | null;
}

export function getEntryOfficeRoute(
    entry: ShiftNotificationEntry,
    departments: Array<{ id: string; office_id?: string | null }> = [],
    scope?: ShiftNotificationScope
): string | null {
    const officeId =
        entry.office_id ??
        departments.find((d) => d.id === entry.department_id)?.office_id ??
        departments.find((d) => d.id === scope?.department_id)?.office_id ??
        scope?.office_id;

    if (!officeId) return null;

    const params = new URLSearchParams();
    if (entry.id) params.set('entry', entry.id);
    if (entry.department_id) params.set('dept', entry.department_id);
    else if (scope?.department_id) params.set('dept', scope.department_id);

    const query = params.toString();
    return query ? `/office/${officeId}?${query}` : `/office/${officeId}`;
}

export function getEntryAdminRoute(
    entry: ShiftNotificationEntry,
    departments: Array<{ id: string; office_id?: string | null }> = [],
    scope?: ShiftNotificationScope
): string | null {
    const departmentId = entry.department_id ?? scope?.department_id;
    if (!departmentId) return null;

    const officeId =
        entry.office_id ??
        departments.find((d) => d.id === departmentId)?.office_id ??
        departments.find((d) => d.id === scope?.department_id)?.office_id ??
        scope?.office_id;

    if (!officeId) return null;

    const params = new URLSearchParams({ tab: 'entries', office: officeId, dept: departmentId });
    if (entry.id) params.set('entry', entry.id);
    else if (entry.name) {
        params.set('name', entry.name);
        if (entry.extension) params.set('extension', entry.extension);
    }
    return `/admin?${params.toString()}`;
}
