import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAccount } from "./lib/session-context.ts";
import { vfs } from "./lib/virtual-fs.ts";

initAccount();
vfs.init();

createRoot(document.getElementById("root")!).render(<App />);
