import { NavLink, Outlet } from "react-router-dom";

const routes = [
  { path: "/world-designer", label: "World" },
  { path: "/character-blueprinter", label: "Characters" },
  { path: "/story-architect", label: "Story" },
  { path: "/session", label: "Session" },
] as const;

const shell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  background: "#1e1e2e",
  color: "#cdd6f4",
  boxSizing: "border-box",
};

const nav: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  padding: "8px 12px",
  background: "#181825",
  borderBottom: "1px solid #313244",
  flexShrink: 0,
};

const main: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflowX: "hidden",
};

function linkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 4,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: isActive ? 700 : 400,
    color: isActive ? "#cba6f7" : "#cdd6f4",
    background: isActive ? "#313244" : "transparent",
    whiteSpace: "nowrap",
  };
}

export function AppShell() {
  return (
    <div style={shell}>
      <nav style={nav} aria-label="primary">
        {routes.map(r => (
          <NavLink key={r.path} to={r.path} style={linkStyle}>
            {r.label}
          </NavLink>
        ))}
      </nav>
      <main style={main}>
        <Outlet />
      </main>
    </div>
  );
}
