import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  ChevronDown 
} from "lucide-react";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="hidden sm:block text-right mr-1">
          <p className="text-xs font-semibold text-neutral-900 leading-none">
            {user.firstName || user.username}
          </p>
          <p className="text-[10px] text-neutral-500 leading-none mt-1 truncate max-w-[100px]">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <img
          src={user.imageUrl}
          alt={user.fullName || "User avatar"}
          className="w-8 h-8 rounded-full border border-white shadow-sm object-cover"
        />
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <p className="text-sm font-medium text-neutral-900">
               {user.fullName}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          
          <div className="p-1">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary rounded-lg transition-colors group"
            >
              <LayoutDashboard className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
              Dashboard
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary rounded-lg transition-colors group"
            >
              <Settings className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
              Settings
            </Link>
          </div>

          <div className="border-t border-neutral-100 p-1">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
