import {
  Activity,
  AppWindow,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  BrainCircuit,
  Cloud,
  Cpu,
  Crown,
  Database,
  FileEdit,
  FlaskConical,
  FolderKanban,
  Gamepad2,
  Globe,
  Languages,
  Megaphone,
  Rocket,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trees,
} from 'lucide-react';
import type { ComponentType } from 'react';

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Server,
  Activity,
  ShoppingBag,
  BookOpen,
  Languages,
  Trees,
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  Crown,
  FileEdit,
  Bot,
  FlaskConical,
  Terminal,
  BookMarked,
  Gamepad2,
  Globe,
  Megaphone,
  BarChart3,
  Rocket,
  Settings,
  AppWindow,
  Cloud,
  Cpu,
  Database,
  Bell,
  FolderKanban,
};

export const AVAILABLE_ICON_NAMES = Object.keys(ICON_MAP);

interface IconGlyphProps {
  name: string;
  className?: string;
}

export function IconGlyph({ name, className = 'w-7 h-7' }: IconGlyphProps) {
  const Icon = ICON_MAP[name] ?? AppWindow;
  return <Icon className={className} />;
}
