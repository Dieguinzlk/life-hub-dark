import { Link, useLocation } from "@tanstack/react-router";
import { Home, Wallet, Calendar, Target, Sparkles } from "lucide-react";

export function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: "/", label: "Início", icon: Home },
    { to: "/financas", label: "Finanças", icon: Wallet },
    { to: "/rotina", label: "Rotina", icon: Calendar },
    { to: "/metas", label: "Metas", icon: Target },
  ];

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 px-4 max-w-md mx-auto pointer-events-none">
      <nav className="pointer-events-auto bg-[#12141D]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-2xl flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-full transition-all duration-200 ${
                isActive ? "text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* Botão em Destaque Especial para o Assistente IA */}
        <Link
          to="/assistente"
          className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-4 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-emerald-400/20 active:scale-95"
        >
          <Sparkles className="h-4 w-4 fill-slate-950" />
          <span className="text-xs tracking-tight">Assistente IA</span>
        </Link>
      </nav>
    </div>
  );
}
