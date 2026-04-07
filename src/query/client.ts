import { QueryClient } from 'react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
