"use client";

import { useRouter } from "next/navigation";
import { Upload, Plus, ArrowRight } from "lucide-react";
import Modal from "./modal";

/* The "Add projects" chooser — the same interface AD (P&C) get when responding to a
   request. Lets IO pick between bulk upload and the guided single-project wizard.
   Shared so the Projects page button and the dashboard Quick actions open the same UI. */
function MethodCard({
  icon, title, blurb, cta, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-surface rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3 transition-all hover:border-accent hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <p className="text-label-lg font-bold text-fg mb-1">{title}</p>
        <p className="text-body-sm text-fg-muted leading-relaxed">{blurb}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent">
        {cta}
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export default function CreateProjectChooser({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose} maxWidth="lg" labelledBy="create-chooser-title">
      <h2 id="create-chooser-title" className="text-headline-sm font-bold text-fg mb-1">
        Add projects
      </h2>
      <p className="text-body-sm text-fg-muted mb-5">How would you like to add projects?</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodCard
          icon={<Upload size={20} className="text-accent" />}
          title="Upload by batch"
          blurb="Download the Excel template, fill it in, and upload many projects at once. Best for a long list."
          cta="Start upload"
          onClick={() => router.push("/submissions/upload")}
        />
        <MethodCard
          icon={<Plus size={20} className="text-accent" />}
          title="Create individually"
          blurb="Fill in a guided form, one project at a time. Best for adding just a few projects."
          cta="Create a project"
          onClick={() => router.push("/projects/new")}
        />
      </div>
    </Modal>
  );
}
