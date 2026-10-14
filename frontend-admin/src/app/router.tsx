import { createBrowserRouter, type RouteObject } from 'react-router';

import { AppShell } from '@/components/AppShell/AppShell';
import { HomeRedirect } from '@/routes/HomeRedirect';
import { LoginPage } from '@/routes/LoginPage';
import { NotFoundPage } from '@/routes/NotFoundPage';

/** Areas are code-split: a seller never downloads the platform pages and vice versa. */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'seller',
        lazy: async () => ({ Component: (await import('@/routes/seller/SellerArea')).SellerArea }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/routes/seller/SellerHomePage')).SellerHomePage,
            }),
          },
          {
            path: 'products',
            lazy: async () => ({
              Component: (await import('@/routes/seller/ProductsPage')).ProductsPage,
            }),
          },
          {
            path: 'orders',
            lazy: async () => ({
              Component: (await import('@/routes/seller/OrdersPage')).OrdersPage,
            }),
          },
          {
            path: 'products/:id',
            lazy: async () => ({
              Component: (await import('@/routes/seller/ProductEditorPage')).ProductEditorPage,
            }),
          },
        ],
      },
      {
        path: 'platform',
        lazy: async () => ({
          Component: (await import('@/routes/platform/PlatformArea')).PlatformArea,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/routes/platform/PlatformHomePage')).PlatformHomePage,
            }),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
