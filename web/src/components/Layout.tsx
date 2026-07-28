import { NavLink, Outlet } from "react-router-dom";
import { FileText, ScanSearch, Mail, MessageSquare, Settings, Briefcase } from "lucide-react";

const nav = [
  { to: "/", icon: FileText, label: "Resume" },
  { to: "/ats", icon: ScanSearch, label: "ATS Score" },
  { to: "/cover-letter", icon: Mail, label: "Cover Letter" },
  { to: "/interview", icon: MessageSquare, label: "Interview" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">
                Job<span className="text-blue-600">aton</span>
                <span className="text-[10px] ml-1 text-gray-400 font-normal">OSS</span>
              </span>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1 overflow-x-auto">
              {nav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-gray-400">
          <span>Jobaton OSS — Self-hosted AI career toolkit</span>
          <a href="https://jobaton.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            Upgrade to Jobaton Pro
          </a>
        </div>
      </footer>
    </div>
  );
}
