import { describe, expect, it } from 'vitest';
import { getEntryAdminRoute, getEntryOfficeRoute } from '@/lib/shiftNotifications';

describe('getEntryOfficeRoute', () => {
    it('builds a route from the department office mapping', () => {
        const route = getEntryOfficeRoute(
            { id: 'entry-42', department_id: 'dept-7', office_id: null },
            [{ id: 'dept-7', office_id: 'office-9' }]
        );

        expect(route).toBe('/office/office-9?entry=entry-42&dept=dept-7');
    });

    it('prefers an explicit office id when present on the entry', () => {
        const route = getEntryOfficeRoute(
            { id: 'entry-5', department_id: 'dept-2', office_id: 'office-1' },
            [{ id: 'dept-2', office_id: 'office-9' }]
        );

        expect(route).toBe('/office/office-1?entry=entry-5&dept=dept-2');
    });

    it('falls back to the current sub-admin office scope when the entry has no office id', () => {
        const route = getEntryOfficeRoute(
            { id: 'entry-88', department_id: null, office_id: null },
            [],
            { office_id: 'office-15', department_id: 'dept-21' }
        );

        expect(route).toBe('/office/office-15?entry=entry-88&dept=dept-21');
    });
});

describe('getEntryAdminRoute', () => {
    it('opens the admin entries tab with the target entry selected', () => {
        const route = getEntryAdminRoute(
            { id: 'entry-42', department_id: 'dept-7', office_id: null },
            [{ id: 'dept-7', office_id: 'office-9' }]
        );

        expect(route).toBe('/admin?tab=entries&office=office-9&dept=dept-7&entry=entry-42');
    });

    it('uses the assigned department and office when entry scope is incomplete', () => {
        const route = getEntryAdminRoute(
            { id: 'entry-88', department_id: null, office_id: null },
            [],
            { office_id: 'office-15', department_id: 'dept-21' }
        );

        expect(route).toBe('/admin?tab=entries&office=office-15&dept=dept-21&entry=entry-88');
    });

    it('uses the notification snapshot to locate entries without an entry id', () => {
        const route = getEntryAdminRoute(
            { department_id: 'dept-7', name: 'Alex Doe', extension: '123' },
            [{ id: 'dept-7', office_id: 'office-9' }]
        );

        expect(route).toBe('/admin?tab=entries&office=office-9&dept=dept-7&name=Alex+Doe&extension=123');
    });
});
