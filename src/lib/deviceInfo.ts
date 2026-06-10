export function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Mobile/Tablet detection
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  
  // Desktop detection
  if (/Macbook|Mac OS X/.test(ua) && !/iPhone|iPad|Android/.test(ua)) return 'Mac Laptop';
  if (/Windows NT/.test(ua)) {
    // Detect if it's a laptop or desktop based on screen characteristics
    // Most Windows laptops will be detected as Windows Laptop
    return 'Windows Laptop';
  }
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'Linux Desktop';
  
  return 'Unknown Device';
}

export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (/Chrome/.test(ua) && !/Chromium|Edge/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua) && !/Chrome|Edge/.test(ua)) return 'Safari';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Edge|Edg/.test(ua)) return 'Edge';
  if (/Opera|OPR/.test(ua)) return 'Opera';
  return 'Unknown Browser';
}

export async function getLocationName(): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return `${data.city || 'Unknown'}, ${data.country_name || 'Unknown'}`;
  } catch (error) {
    return 'Location unavailable';
  }
}

export function getDateTimeInfo(): { time: string; date: string; day: string; dateObj: Date } {
  // Bangladesh timezone (UTC+6)
  const now = new Date();
  const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = String(bdTime.getHours()).padStart(2, '0');
  const minutes = String(bdTime.getMinutes()).padStart(2, '0');
  const seconds = String(bdTime.getSeconds()).padStart(2, '0');
  
  return {
    time: `${hours}:${minutes}:${seconds}`,
    date: bdTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    day: days[bdTime.getDay()],
    dateObj: bdTime,
  };
}
