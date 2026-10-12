import { createBrowserRouter } from 'react-router';

import { NotFoundPage } from '@/routes/NotFoundPage';
import { StartPage } from '@/routes/StartPage';

export const router = createBrowserRouter([
  { path: '/', element: <StartPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
