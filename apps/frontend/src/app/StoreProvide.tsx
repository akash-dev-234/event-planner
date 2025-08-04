"use client";
import { AppStore, makeStore } from "@/lib/redux/store";
import { useRef } from "react";
import { Provider } from "react-redux";
import AuthInitializer from "@/components/AuthInitializer";

// Create a global store instance to persist across hot reloads in development
let globalStore: AppStore | undefined;

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>(undefined);
  
  if (!storeRef.current) {
    // In development, reuse the global store to persist across hot reloads
    if (process.env.NODE_ENV === 'development' && globalStore) {
      storeRef.current = globalStore;
    } else {
      // Create the store instance the first time this renders
      storeRef.current = makeStore();
      if (process.env.NODE_ENV === 'development') {
        globalStore = storeRef.current;
      }
    }
  }

  return (
    <Provider store={storeRef.current}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
