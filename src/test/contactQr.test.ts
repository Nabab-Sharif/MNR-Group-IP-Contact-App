import { describe, it, expect } from 'vitest';
import { buildContactQrValue } from '@/lib/contactQr';

describe('buildContactQrValue', () => {
    it('creates a phone link for the phone QR code', () => {
        const value = buildContactQrValue('Jane Doe', '+8801712345678', 'phone');

        expect(value).toBe('tel:+8801712345678');
    });

    it('creates a mailto link for the email QR code', () => {
        const value = buildContactQrValue('Jane Doe', 'jane@example.com', 'email');

        expect(value).toBe('mailto:jane@example.com');
    });

    it('creates a WhatsApp URL for the WhatsApp QR code', () => {
        const value = buildContactQrValue('Jane Doe', '+8801712345678', 'whatsapp');

        expect(value).toBe('https://wa.me/8801712345678');
    });
});
