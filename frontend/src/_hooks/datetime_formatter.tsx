

export default function formatDateTime(dateString: string): string {
    console.log('Incomming date string:', dateString);
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If within 1 hour, show minutes ago
    if (diffMinutes < 60) {
      return diffMinutes === 0 ? 'now' : `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }

    // If within 24 hours, show hours ago
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    // If older, show full date and time without year/month (just day and time)
    const dateObj = new Date(dateString);
    const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    console.log('Formatted day:', dayStr, 'Formatted time:', timeStr);
    return `${dayStr} ${timeStr}`;
  }