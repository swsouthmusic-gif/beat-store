import { configureStore } from '@reduxjs/toolkit';
import { beatApi } from './beatApi';

export const store = configureStore({
  reducer: {
    [beatApi.reducerPath]: beatApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(beatApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
