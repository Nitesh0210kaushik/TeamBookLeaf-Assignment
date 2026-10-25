import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { store } from "./store";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{ style: { fontSize: "14px", borderRadius: "10px" }, duration: 3500 }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
