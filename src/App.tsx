import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { WorldDesigner } from "@/components/WorldDesigner/WorldDesigner";
import { CharacterSheet } from "@/components/CharacterBluepriter/CharacterSheet";
import { FlowchartEditor } from "@/components/StoryArchitect/FlowchartEditor";
import { SessionPanel } from "@/components/SessionPanel/SessionPanel";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/world-designer" replace />} />
          <Route path="/world-designer" element={<WorldDesigner />} />
          <Route path="/character-blueprinter" element={<CharacterSheet sheetId="" />} />
          <Route path="/story-architect" element={<FlowchartEditor />} />
          <Route path="/session" element={<SessionPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
