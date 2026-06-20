export const LIBRARY_SORT_OPTIONS = [
  'recentlyAdded',
  'recentlyRead',
  'title',
  'unreadCount',
] as const;

export type LibrarySortOption = typeof LIBRARY_SORT_OPTIONS[number];

export const LIBRARY_SORT_LABELS: Record<LibrarySortOption, string> = {
  recentlyAdded: 'Recently added',
  recentlyRead: 'Recently read',
  title: 'Title',
  unreadCount: 'Unread',
};
