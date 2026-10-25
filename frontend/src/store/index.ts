import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { useDispatch } from "react-redux";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

// Enables refetchOnFocus / refetchOnReconnect.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
