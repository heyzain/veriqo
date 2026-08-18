"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { projectNavigation, resolveProjectHref } from "@/config/navigation.config";
import type { Project } from "@/types/domain";

export type ProjectSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
};

type SearchResult = {
  id: string;
  title: string;
  category: "Navigation" | "Action" | "Section";
  href: string;
  icon: IconName;
  description?: string;
  badge?: string;
};

export function ProjectSearchDialog({
  open,
  onOpenChange,
  project,
}: ProjectSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputId = useId();
  const router = useRouter();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
    onOpenChange(nextOpen);
  };

  const items = useMemo<SearchResult[]>(() => {
    const list: SearchResult[] = [];

    // 1. Navigation items
    for (const item of projectNavigation) {
      list.push({
        id: `nav-${item.key}`,
        title: item.label,
        category: "Navigation",
        href: resolveProjectHref(project.slug, item),
        icon: item.icon,
        description: `Navigate to ${item.label} in ${project.name}`,
      });
    }

    // 2. Common Quick Actions
    list.push({
      id: "act-mcp",
      title: "Set up Claude MCP connection",
      category: "Action",
      href: `/projects/${project.slug}/mcp`,
      icon: "mcp",
      description: "Get project credentials and copyable MCP commands",
    });

    list.push({
      id: "act-settings",
      title: "Edit project settings",
      category: "Action",
      href: `/projects/${project.slug}/settings`,
      icon: "settings",
      description: "Update URL, environment, repository, or archive state",
    });

    list.push({
      id: "act-all-projects",
      title: "Switch to another project",
      category: "Action",
      href: "/projects",
      icon: "projects",
      description: "Return to the workspace project library",
    });

    return list;
  }, [project.slug, project.name]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={`Search ${project.name}`}
        description="Search across project navigation and quick actions"
        className="max-w-xl p-0 overflow-hidden bg-surface border-subtle"
      >
        <div className="flex items-center gap-3 border-b border-subtle px-4 py-3 bg-surface">
          <Icon name="search" size={18} className="text-foreground-muted shrink-0" />
          <input
            id={searchInputId}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${project.name}...`}
            className="flex-1 bg-transparent text-body text-foreground placeholder:text-foreground-muted focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-subtle bg-inset px-1.5 py-0.5 text-[11px] text-foreground-muted font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-body-sm text-foreground-muted">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-fast ${
                      isSelected ? "bg-inset text-foreground" : "text-foreground-secondary hover:bg-inset/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-surface border border-subtle shrink-0">
                        <Icon name={item.icon} size={15} className="text-foreground-muted" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-body-sm font-medium text-foreground truncate">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="text-mono-sm text-[11px] text-foreground-muted truncate">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-eyebrow text-foreground-muted shrink-0 text-[10px] uppercase tracking-wider">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-subtle bg-inset/40 px-4 py-2 text-[11px] text-foreground-muted">
          <div className="flex items-center gap-2">
            <span>Navigate <kbd className="font-mono">↑↓</kbd></span>
            <span>Select <kbd className="font-mono">↵</kbd></span>
          </div>
          <span>{project.publicId}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
