// Isolated application harness: authentication is bypassed only here, with local test data.
import { createRoot } from "react-dom/client";
import { Projects, Project } from "../../components/projects/live-projects";
import { usePathname } from "./navigation-fixture";
import { Toaster } from "../../components/ui/toast";
import { TooltipProvider } from "../../components/ui/tooltip";
import "../../app/globals.css";
function Preview() {
  const path = usePathname();
  return (
    <TooltipProvider>
      {path === "/projects" ? (
        <Projects />
      ) : (
        <Project projectId="workspace_fixture" />
      )}
      <Toaster />
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")).render(<Preview />);
