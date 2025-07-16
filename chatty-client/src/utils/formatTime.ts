export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const isSameDay = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const daysDiff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (isSameDay) {
    // Today => HH:mm
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (isYesterday) {
    return "Yesterday";
  }

  if (daysDiff < 7) {
    // Last 7 days => Day name
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  // Older => DD/MM/YYYY
  return date.toLocaleDateString("en-IN"); // You can use "en-US" or any format
}
