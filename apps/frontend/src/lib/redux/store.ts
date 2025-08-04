import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice";
import toastReducer from "./features/toastSlice";
import organizationReducer from "./features/organizationSlice";
import eventsReducer from "./features/eventsSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      toast: toastReducer,
      organization: organizationReducer,
      events: eventsReducer,
    },
    // Enable Redux DevTools and disable HMR state reset in development
    devTools: process.env.NODE_ENV !== 'production',
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
