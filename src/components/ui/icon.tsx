import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Activity as ActivityIcon,
  BarChart3,
  Ban,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileCode2,
  FileInput,
  FlaskConical,
  GitMerge,
  Info,
  KeyRound,
  LayoutDashboard,
  Link2,
  ListChecks,
  ListTodo,
  Loader2,
  type LucideIcon,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pause,
  Pencil,
  Plug,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  SquareUser,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

/**
 * The only place lucide-react is imported. Every icon used in the product
 * is named here; components reference icons by this key rather than
 * importing from the icon library directly (01-DESIGN-SYSTEM.md, 03-CLAUDE-RULES.md).
 */
const registry = {
  // Navigation
  overview: LayoutDashboard,
  features: FlaskConical,
  testCases: ListChecks,
  testRuns: PlayCircle,
  issues: AlertCircle,
  activity: ActivityIcon,
  analytics: BarChart3,
  mcp: Plug,
  settings: Settings,
  projects: LayoutDashboard,

  // Status / lifecycle
  draft: Pencil,
  needsReview: Sparkles,
  approved: Check,
  changed: RefreshCcw,
  archived: Archive,
  planned: Clock,
  inProgress: Loader2,
  paused: Pause,
  notRun: Circle,
  fail: X,
  partial: AlertTriangle,
  blocked: Ban,
  alert: AlertCircle,

  // Actors
  human: User,
  claude: Bot,
  system: SquareUser,
  import: FileInput,

  // Generic UI
  check: Check,
  minus: Minus,
  close: X,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  search: Search,
  plus: Plus,
  spinner: Loader2,
  info: Info,
  copy: Copy,
  eye: Eye,
  eyeOff: EyeOff,
  more: MoreHorizontal,
  warning: AlertTriangle,
  key: KeyRound,
  revoke: Trash2,

  // Feature relationships (Phase 4)
  merge: GitMerge,
  dependency: Link2,
  roles: Users,
  sourceReference: FileCode2,
  criteria: ListTodo,

  // Test runs (Phase 6)
  evidence: Paperclip,
  upload: Upload,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof registry;

export type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
  /** Set only when the icon carries meaning with no adjacent visible text. */
  label?: string;
};

export function Icon({ name, className, size = 16, label }: IconProps) {
  const LucideComponent = registry[name];

  return (
    <LucideComponent
      className={className}
      size={size}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      strokeWidth={1.75}
    />
  );
}
