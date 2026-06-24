import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <>

    <Toaster
      position="bottom-center"
      reverseOrder={false}
      toastOptions={{
        duration: 1500,
        style: {
          fontSize: "14px",
          padding: "12px 16px",
        },
      }}
    />

    <App />

  </>
);