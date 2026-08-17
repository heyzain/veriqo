"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";

export function OverlaysSection() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Tooltip</h3>
        <Tooltip content="Copies the connection command to your clipboard">
          <Button intent="secondary">Copy command</Button>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Popover</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button intent="secondary">Filter</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="text-body-sm text-foreground-muted">
              A popover holds lightweight inline controls — filters, quick edits — without a full
              dialog.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Menu</h3>
        <Menu>
          <MenuTrigger asChild>
            <IconButton icon="more" label="Row actions" intent="secondary" />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel className="px-2.5 py-1.5 text-label-style text-foreground-muted">
              PV-07
            </MenuLabel>
            <MenuItem icon="check">Mark ready</MenuItem>
            <MenuItem icon="changed">Duplicate</MenuItem>
            <MenuSeparator />
            <MenuItem icon="archived" destructive>
              Archive
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Dialog</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button intent="secondary">Create focused rerun</Button>
          </DialogTrigger>
          <DialogContent title="Create focused rerun" description="Reruns only the tests affected by ISS-14.">
            <p className="text-body-sm text-foreground-muted">
              This creates a new run scoped to PV-07 against build 1.4.0-rc.2.
            </p>
            <DialogFooter>
              <Button intent="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Create rerun</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Alert dialog</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button intent="danger">Archive feature</Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            title="Archive Private Vault?"
            description="Archived features are hidden from active coverage but keep their history. This can be undone from Settings."
          >
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button intent="secondary">Cancel</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button intent="danger">Archive</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Drawer</h3>
        <Drawer>
          <DrawerTrigger asChild>
            <Button intent="secondary">Inspect PV-07</Button>
          </DrawerTrigger>
          <DrawerContent title="PV-07" description="Vault locks after session end">
            <p className="text-body-sm text-foreground-muted">
              The contextual drawer opens for inspection without leaving the current list — used
              for record detail from Phase 4 onward.
            </p>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
