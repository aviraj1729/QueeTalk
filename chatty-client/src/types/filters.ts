export const filters = ["All", "Unread", "Favourites", "Groups"] as const;
export type FilterType = (typeof filters)[number];
