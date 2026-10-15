import { IconName } from '@/enums/icon-name.enum';

/** Path data per icon, drawn on a 24×24 grid with a 1.8px round stroke. */
export const ICON_PATHS: Readonly<Record<IconName, readonly string[]>> = {
  [IconName.Search]: ['M4 11a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'm20 20-3.5-3.5'],
  [IconName.Cart]: [
    'M7.5 20a1.5 1.5 0 1 0 3.0 0a1.5 1.5 0 1 0 -3.0 0',
    'M16.5 20a1.5 1.5 0 1 0 3.0 0a1.5 1.5 0 1 0 -3.0 0',
    'M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6',
  ],
  [IconName.Bell]: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  [IconName.User]: ['M8 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M4 21a8 8 0 0 1 16 0'],
  [IconName.Store]: [
    'M3 9l1.5-5h15L21 9',
    'M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z',
    'M5 13v8h14v-8',
    'M10 21v-5h4v5',
  ],
  [IconName.Globe]: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
    'M3 12h18',
    'M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18',
  ],
  [IconName.Truck]: [
    'M3 6h11v10H3z',
    'M14 9h4l3 3v4h-7',
    'M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ],
  [IconName.Shield]: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'm9 12 2 2 4-4'],
  [IconName.Coins]: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
    'M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5',
    'M12 6v2',
    'M12 16v2',
  ],
  [IconName.Heart]: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  [IconName.ChevronRight]: ['m9 6 6 6-6 6'],
  [IconName.Package]: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  [IconName.Bolt]: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  [IconName.Grid]: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  [IconName.Chat]: ['M4 5h16v11H9l-5 4z'],
  [IconName.Check]: ['m5 12 5 5 9-10'],
  [IconName.Pin]: [
    'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z',
    'M9.5 9a2.5 2.5 0 1 0 5.0 0a2.5 2.5 0 1 0 -5.0 0',
  ],
  [IconName.Card]: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'],
  [IconName.Dashboard]: ['M4 4h7v9H4z', 'M13 4h7v5h-7z', 'M13 11h7v9h-7z', 'M4 15h7v5H4z'],
  [IconName.Box]: ['M4 7l8-4 8 4v10l-8 4-8-4z', 'M4 7l8 4 8-4', 'M12 11v10'],
  [IconName.Receipt]: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  [IconName.Users]: [
    'M5.5 8a3.5 3.5 0 1 0 7.0 0a3.5 3.5 0 1 0 -7.0 0',
    'M2 20a7 7 0 0 1 14 0',
    'M16 4.5a3.5 3.5 0 0 1 0 7',
    'M18 14a7 7 0 0 1 4 6',
  ],
  [IconName.Flag]: ['M5 21V4', 'M5 4h12l-2 4 2 4H5'],
  [IconName.Logout]: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h11'],
  [IconName.Activity]: ['M3 12h4l3-8 4 16 3-8h4'],
  [IconName.Plus]: ['M12 5v14', 'M5 12h14'],
  [IconName.Trend]: ['m3 17 6-6 4 4 8-8', 'M15 7h6v6'],
  [IconName.Clock]: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M12 7v5l3 2'],
};
