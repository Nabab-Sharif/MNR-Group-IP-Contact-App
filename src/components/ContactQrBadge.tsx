import { QRCodeSVG } from 'qrcode.react';
import { buildContactQrValue, ContactQrKind, getQrColors } from '@/lib/contactQr';

interface ContactQrBadgeProps {
    name: string;
    value?: string;
    kind: ContactQrKind;
    size?: number;
    className?: string;
    isOpen?: boolean;
    onToggle?: () => void;
}

const ContactQrBadge = ({ name, value, kind, size = 96, className = '', isOpen = false, onToggle }: ContactQrBadgeProps) => {
    if (!value) return null;

    const qrValue = buildContactQrValue(name, value, kind);
    const { bgColor, fgColor } = getQrColors();
    const label = isOpen ? 'Scan this code' : 'Show QR code';
    const subtitle = kind === 'phone' ? 'Phone' : kind === 'whatsapp' ? 'WhatsApp' : 'Email';

    return (
        <button
            type="button"
            onClick={onToggle}
            className={`block flex-shrink-0 rounded-xl border border-orange-200 bg-orange-50 p-2 shadow-sm text-left transition-all duration-200 dark:border-orange-800 dark:bg-orange-900/10 ${isOpen ? 'ring-2 ring-orange-300 dark:ring-orange-500' : ''} ${className}`.trim()}
        >
            {isOpen && (
                <div className="rounded-md bg-white p-1">
                    <QRCodeSVG
                        value={qrValue}
                        size={size}
                        level="H"
                        includeMargin={true}
                        marginSize={1}
                        bgColor={bgColor}
                        fgColor={fgColor}
                        className="rounded-md"
                    />
                </div>
            )}
            <p className="mt-1 text-[10px] font-semibold text-center text-orange-700 dark:text-orange-400">{subtitle}</p>
            <p className="text-[9px] font-medium text-center text-slate-500 dark:text-slate-400">{label}</p>
        </button>
    );
};

export default ContactQrBadge;
