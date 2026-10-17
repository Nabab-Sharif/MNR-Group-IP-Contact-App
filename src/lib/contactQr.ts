export type ContactQrKind = 'phone' | 'email' | 'whatsapp';

export const getQrColors = () => ({
    bgColor: '#ffffff',
    fgColor: '#0f172a',
});

const normalizePhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith('880') ? digits : `88${digits}`;
};

export const buildContactQrValue = (_name: string, value?: string, kind: ContactQrKind = 'phone'): string => {
    if (!value) return '';

    if (kind === 'phone') {
        const phone = value.trim().replace(/[^\d+]/g, '');
        return `tel:${phone}`;
    }

    if (kind === 'whatsapp') {
        return `https://wa.me/${normalizePhone(value)}`;
    }

    return `mailto:${value.trim()}`;
};
