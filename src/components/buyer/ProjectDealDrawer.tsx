"use client";

import { useEffect, useRef, useState, type MutableRefObject, type ReactNode, type SyntheticEvent } from "react";
import Link from "next/link";
import { Button, Tab } from "@mui/material";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";
import { PrimaryTabs } from "@/components/ui/PrimaryTabs";
import { formatCurrency } from "@/lib/utils";

export interface ProjectDealDrawerDeal {
  id: string;
  headline: string;
  description?: string | null;
  industry: string;
  state: string | null;
  region: string | null;
  geography_display: string;
  status: string;
  revenue_year_1?: number | null;
  ebitda_year_1?: number | null;
  revenue_year_2?: number | null;
  ebitda_year_2?: number | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  revenue_projection?: number | null;
  ebitda_projection?: number | null;
  fiscal_year_labels?: Record<string, string> | null;
  nda_type?: string | null;
  cim_sharing_preference?: string | null;
  nda_vetting_preference?: string | null;
  has_teaser_document?: boolean;
  has_cim_document?: boolean;
  has_nda_document?: boolean;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  published_at?: string | null;
  closed_at?: string | null;
  engagement: {
    id: string;
    stage: string;
    nda_status: string;
    nda_signed_at?: string | null;
    cim_released?: boolean | null;
    cim_released_at?: string | null;
    cim_viewed_at?: string | null;
    cim_downloaded_at?: string | null;
    pass_reason?: string | null;
    pass_reason_detail?: string | null;
    declined_at?: string | null;
    vetting_status?: string | null;
    vetting_rejection_reason?: string | null;
  } | null;
}

interface ProjectDealDrawerProps {
  deal: ProjectDealDrawerDeal;
  workspaceHref: string;
  onClose: () => void;
  restoreFocusRef?: MutableRefObject<HTMLElement | null>;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "contained" | "outlined";
  }>;
}

const FOCUSABLE_DRAWER_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getGeography(deal: ProjectDealDrawerDeal) {
  return deal.geography_display === "state" ? deal.state : deal.region;
}

function formatMetric(value: number | null | undefined): string {
  return value != null ? formatCurrency(value) : "—";
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value.replace(/_/g, " ");
}

function formatBooleanAvailability(value: boolean | undefined): string {
  if (value == null) {
    return "Not provided";
  }

  return value ? "Available" : "Not available";
}

function formatCustomNdaAvailability(deal: ProjectDealDrawerDeal): string {
  if (deal.has_nda_document === undefined) {
    return "Not provided";
  }

  const ndaStatus = deal.engagement?.nda_status;
  const ndaIsRelevantToBuyer = ndaStatus === "sent" || ndaStatus === "signed";

  if (!ndaIsRelevantToBuyer) {
    return "Not yet available";
  }

  return deal.has_nda_document ? "Available" : "Not uploaded";
}

function formatCimAvailability(deal: ProjectDealDrawerDeal): string {
  if (deal.has_cim_document === undefined) {
    return "Not provided";
  }

  if (deal.has_cim_document) {
    return "Available";
  }

  if (deal.engagement?.nda_status === "signed" && deal.engagement?.cim_released) {
    return "Not uploaded";
  }

  return "Not yet available";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const hasTime = value.includes("T");

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(parsed);
}

function formatNdaType(value: string | null | undefined): string {
  if (value === "platform") {
    return "Platform standard NDA";
  }

  if (value === "custom") {
    return "Custom NDA";
  }

  return formatLabel(value);
}

function formatCimSharingPreference(value: string | null | undefined): string {
  if (value === "auto") {
    return "Automatic release";
  }

  if (value === "manual") {
    return "Manual release";
  }

  return formatLabel(value);
}

function formatNdaVettingPreference(value: string | null | undefined): string {
  if (value === "auto") {
    return "Automatic release";
  }

  if (value === "manual") {
    return "Manual release";
  }

  return formatLabel(value);
}

function formatCimStatus(engagement: ProjectDealDrawerDeal["engagement"]): string {
  if (!engagement) {
    return "—";
  }

  if (engagement.cim_downloaded_at) {
    return "Downloaded";
  }

  if (engagement.cim_viewed_at) {
    return "Viewed";
  }

  if (engagement.cim_released) {
    return "Released";
  }

  return "Not released";
}

function getFinancialRows(deal: ProjectDealDrawerDeal) {
  return [
    {
      key: "year-1",
      label: deal.fiscal_year_labels?.year_1 || "Year 1",
      revenue: deal.revenue_year_1,
      ebitda: deal.ebitda_year_1,
    },
    {
      key: "year-2",
      label: deal.fiscal_year_labels?.year_2 || "Year 2",
      revenue: deal.revenue_year_2,
      ebitda: deal.ebitda_year_2,
    },
    {
      key: "year-3",
      label: deal.fiscal_year_labels?.year_3 || "Year 3",
      revenue: deal.revenue_year_3,
      ebitda: deal.ebitda_year_3,
    },
    {
      key: "projection",
      label: deal.fiscal_year_labels?.projection || "Projection",
      revenue: deal.revenue_projection,
      ebitda: deal.ebitda_projection,
    },
  ];
}

interface DealUpdateItem {
  key: string;
  title: string;
  detail: string;
  timestamp?: string | null;
}

function getChronologicalTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function getDealUpdates(deal: ProjectDealDrawerDeal): DealUpdateItem[] {
  const updates: DealUpdateItem[] = [];
  const isClosedDeal = deal.status === "closed";

  if (!(isClosedDeal && deal.closed_at)) {
    updates.push({
      key: "deal-status",
      title: "Current deal status",
      detail: DEAL_STATUS_LABELS[deal.status] || formatLabel(deal.status),
    });
  }

  if (deal.published_at) {
    updates.push({
      key: "published",
      title: "Deal published",
      detail: "The deal was made visible to buyers.",
      timestamp: deal.published_at,
    });
  }

  if (deal.engagement) {
      updates.push({
        key: "engagement-stage",
        title: "Current engagement stage",
        detail: formatEngagementStageLabel(deal.engagement.stage),
      });

      updates.push({
        key: "nda-status",
        title: "NDA status",
        detail: formatEngagementStageLabel(deal.engagement.nda_status),
        timestamp: deal.engagement.nda_signed_at,
      });
  } else {
    updates.push({
      key: "engagement-not-started",
      title: "Engagement",
      detail: "No active engagement yet.",
    });
  }

  if (deal.engagement?.nda_signed_at) {
    updates.push({
      key: "nda-signed",
      title: "NDA signed",
      detail: "The NDA has been signed.",
      timestamp: deal.engagement.nda_signed_at,
    });
  }

  if (deal.engagement?.cim_released_at) {
    updates.push({
      key: "cim-released",
      title: "CIM released",
      detail: "The broker released CIM access.",
      timestamp: deal.engagement.cim_released_at,
    });
  }

  if (deal.engagement?.cim_viewed_at) {
    updates.push({
      key: "cim-viewed",
      title: "CIM viewed",
      detail: "CIM materials were viewed.",
      timestamp: deal.engagement.cim_viewed_at,
    });
  }

  if (deal.engagement?.cim_downloaded_at) {
    updates.push({
      key: "cim-downloaded",
      title: "CIM downloaded",
      detail: "CIM files were downloaded.",
      timestamp: deal.engagement.cim_downloaded_at,
    });
  }

  if (deal.ioi_due_date) {
    updates.push({
      key: "ioi-due",
      title: "IOI due date",
      detail: "Initial indications of interest are due.",
      timestamp: deal.ioi_due_date,
    });
  }

  if (deal.loi_due_date) {
    updates.push({
      key: "loi-due",
      title: "LOI due date",
      detail: "Letters of intent are due.",
      timestamp: deal.loi_due_date,
    });
  }

  if (deal.closed_at) {
    updates.push({
      key: "closed",
      title: "Deal closed",
      detail: "The deal has been closed.",
      timestamp: deal.closed_at,
    });
  }

  return updates
    .map((update, index) => ({
      update,
      index,
      chronologicalTimestamp: getChronologicalTimestamp(update.timestamp),
    }))
    .sort((a, b) => {
      if (a.chronologicalTimestamp != null && b.chronologicalTimestamp != null) {
        return b.chronologicalTimestamp - a.chronologicalTimestamp;
      }

      if (a.chronologicalTimestamp != null) {
        return -1;
      }

      if (b.chronologicalTimestamp != null) {
        return 1;
      }

      return a.index - b.index;
    })
    .map(({ update }) => update);
}

function DealInfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border-color bg-bg-alt p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <div className="mt-1 text-sm font-semibold text-text">{value}</div>
    </div>
  );
}

function DealSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-primary">{title}</h3>
      {children}
    </section>
  );
}

export function ProjectDealDrawer({ deal, workspaceHref, onClose, restoreFocusRef, actionButtons = [] }: ProjectDealDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "updates" | "files">("details");
  const detailsTabId = `project-deal-drawer-tab-details-${deal.id}`;
  const updatesTabId = `project-deal-drawer-tab-updates-${deal.id}`;
  const filesTabId = `project-deal-drawer-tab-files-${deal.id}`;
  const detailsPanelId = `project-deal-drawer-panel-details-${deal.id}`;
  const updatesPanelId = `project-deal-drawer-panel-updates-${deal.id}`;
  const filesPanelId = `project-deal-drawer-panel-files-${deal.id}`;
  const dealUpdates = getDealUpdates(deal);

  const handleTabChange = (_event: SyntheticEvent, value: unknown) => {
    if (value !== "details" && value !== "updates" && value !== "files") {
      return;
    }

    setActiveTab(value);
  };

  useEffect(() => {
    const focusInitialDrawerElement = window.setTimeout(() => {
      closeButtonRef.current?.focus();
      if (document.activeElement !== closeButtonRef.current) {
        drawerRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const drawer = drawerRef.current;
      if (!drawer) {
        return;
      }

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE_DRAWER_SELECTOR)
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          !element.closest("[hidden]") &&
          !element.closest('[aria-hidden="true"]')
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];

      if (!drawer.contains(document.activeElement)) {
        event.preventDefault();
        firstFocusableElement.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusInitialDrawerElement);
      window.removeEventListener("keydown", handleKeyDown);

      const trigger = restoreFocusRef?.current;
      if (restoreFocusRef) {
        restoreFocusRef.current = null;
      }

      if (trigger && document.contains(trigger)) {
        trigger.focus();
      }
    };
  }, [onClose, restoreFocusRef]);

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div
        aria-hidden="true"
        data-testid="deal-drawer-backdrop"
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-drawer-title"
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border-color bg-bg shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-border-color bg-bg-alt px-6 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="deal-drawer-title" className="text-2xl font-bold text-primary">
                  <Link
                    href={workspaceHref}
                    className="inline-flex rounded-sm transition-colors hover:text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {deal.headline}
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      {DEAL_STATUS_LABELS[deal.status] || deal.status}
                    </span>
                    {deal.engagement ? (
                      <span className="rounded-full bg-subtle px-3 py-1 text-xs font-semibold text-primary">
                        {formatEngagementStageLabel(deal.engagement.stage)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-bg-alt px-3 py-1 text-xs font-semibold text-text-secondary">
                        Not yet engaged
                      </span>
                    )}
                  </div>
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-md border border-border-color px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-alt hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Close
              </button>
            </div>

            <PrimaryTabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="Deal drawer sections"
              variant="fullWidth"
              data-testid="deal-drawer-primary-tabs"
              data-full-width-intent="true"
              className="deal-drawer-primary-tabs -mb-px w-full"
            >
              <Tab label="Details" value="details" id={detailsTabId} aria-controls={detailsPanelId} />
              <Tab label="Messages" value="updates" id={updatesTabId} aria-controls={updatesPanelId} />
              <Tab label="Files" value="files" id={filesTabId} aria-controls={filesPanelId} />
            </PrimaryTabs>
          </div>

          <div className="space-y-6 px-6 pt-4 pb-8">
            <div
              role="tabpanel"
              id={detailsPanelId}
              aria-labelledby={detailsTabId}
              hidden={activeTab !== "details"}
              aria-hidden={activeTab !== "details"}
            >

              <DealSection title="Overview">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DealInfoItem label="Industry" value={deal.industry || "—"} />
                  <DealInfoItem label="Geography" value={getGeography(deal) || "—"} />
                  <DealInfoItem label="Geography Display" value={formatLabel(deal.geography_display)} />
                  <DealInfoItem label="NDA Type" value={formatNdaType(deal.nda_type)} />
                  <DealInfoItem label="IOI Due Date" value={formatDateTime(deal.ioi_due_date)} />
                  <DealInfoItem label="LOI Due Date" value={formatDateTime(deal.loi_due_date)} />
                </div>
                <div className="mt-4 rounded-lg border border-border-color bg-bg-alt p-4 mb-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">About the Business</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {deal.description?.trim() || "No business description provided."}
                  </p>
                </div>
              </DealSection>

              <DealSection title="Financials">
                <div className="overflow-x-auto rounded-lg border border-border-color bg-bg-alt mb-2">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-text-secondary">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Period</th>
                        <th className="px-3 py-2 text-right font-medium">Revenue</th>
                        <th className="px-3 py-2 text-right font-medium">EBITDA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFinancialRows(deal).map((row) => (
                        <tr key={row.key} className="border-t border-border-color">
                          <td className="px-3 py-2 font-medium text-text">{row.label}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{row.revenue != null ? formatMetric(row.revenue) + "M" : "—"}</td>
                          <td className="px-3 py-2 text-right text-text-secondary">{row.ebitda != null ? formatMetric(row.ebitda) + "M" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DealSection>

              <DealSection title="NDA and CIM Process">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-2">
                  <DealInfoItem label="NDA Process" value={formatNdaVettingPreference(deal.nda_vetting_preference)} />
                  <DealInfoItem label="CIM Sharing" value={formatCimSharingPreference(deal.cim_sharing_preference)} />
                  {deal.has_teaser_document !== undefined && (
                    <DealInfoItem label="Teaser" value={formatBooleanAvailability(deal.has_teaser_document)} />
                  )}
                  {deal.has_cim_document !== undefined && (
                    <DealInfoItem label="CIM Document" value={formatCimAvailability(deal)} />
                  )}
                  {deal.nda_type === "custom" && deal.has_nda_document !== undefined && (
                    <DealInfoItem label="Custom NDA Document" value={formatCustomNdaAvailability(deal)} />
                  )}
                </div>
              </DealSection>

              <DealSection title="Engagement">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-2">
                  <DealInfoItem label="Stage" value={formatEngagementStageLabel(deal.engagement?.stage)} />
                  <DealInfoItem label="NDA Status" value={formatEngagementStageLabel(deal.engagement?.nda_status)} />
                  <DealInfoItem label="NDA Signed" value={formatDateTime(deal.engagement?.nda_signed_at)} />
                  <DealInfoItem label="Vetting Status" value={formatLabel(deal.engagement?.vetting_status)} />
                  <DealInfoItem label="CIM Status" value={formatCimStatus(deal.engagement)} />
                  <DealInfoItem label="CIM Released" value={formatDateTime(deal.engagement?.cim_released_at)} />
                  <DealInfoItem label="CIM Viewed" value={formatDateTime(deal.engagement?.cim_viewed_at)} />
                  <DealInfoItem label="CIM Downloaded" value={formatDateTime(deal.engagement?.cim_downloaded_at)} />
                  <DealInfoItem label="Pass Reason" value={deal.engagement?.pass_reason || "—"} />
                  <DealInfoItem label="Declined At" value={formatDateTime(deal.engagement?.declined_at)} />
                </div>
                {(deal.engagement?.pass_reason_detail || deal.engagement?.vetting_rejection_reason) && (
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {deal.engagement.pass_reason_detail && (
                      <DealInfoItem label="Pass Detail" value={deal.engagement.pass_reason_detail} />
                    )}
                    {deal.engagement.vetting_rejection_reason && (
                      <DealInfoItem label="Vetting Rejection Reason" value={deal.engagement.vetting_rejection_reason} />
                    )}
                  </div>
                )}
              </DealSection>

            {(deal.published_at || deal.closed_at) && (
              <DealSection title="Timeline">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DealInfoItem label="Published" value={formatDateTime(deal.published_at)} />
                  <DealInfoItem label="Closed" value={formatDateTime(deal.closed_at)} />
                </div>
              </DealSection>
            )}
          </div>

            <div
              role="tabpanel"
              id={updatesPanelId}
              aria-labelledby={updatesTabId}
              hidden={activeTab !== "updates"}
              aria-hidden={activeTab !== "updates"}
            >
              <DealSection title="Timeline">
                <div className="space-y-3">
                  {dealUpdates.map((update) => (
                    <div key={update.key} className="rounded-lg border border-border-color bg-bg-alt p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text">{update.title}</p>
                        {update.timestamp ? (
                          <p className="text-xs text-text-secondary">{formatDateTime(update.timestamp)}</p>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{update.detail}</p>
                    </div>
                  ))}
                </div>
              </DealSection>
            </div>

            <div
              role="tabpanel"
              id={filesPanelId}
              aria-labelledby={filesTabId}
              hidden={activeTab !== "files"}
              aria-hidden={activeTab !== "files"}
            >
              <DealSection title="Files">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DealInfoItem label="Teaser" value={formatBooleanAvailability(deal.has_teaser_document)} />
                  <DealInfoItem label="CIM Document" value={formatCimAvailability(deal)} />
                  {deal.nda_type === "custom" && (
                    <DealInfoItem label="Custom NDA Document" value={formatCustomNdaAvailability(deal)} />
                  )}
                </div>
              </DealSection>

            </div>
          </div>
        </div>

        <div
          data-testid="deal-drawer-footer"
          className="sticky bottom-0 z-20 border-t border-border-color bg-bg-alt px-6 py-4"
        >
          {actionButtons.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {actionButtons.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant ?? "contained"}
                  size="large"
                  sx={{
                    textTransform: "none",
                    borderRadius: 1,
                    px: 1.75,
                    fontWeight: 600,
                    ...(action.variant === "outlined"
                      ? {
                          borderColor: "var(--color-border)",
                          borderWidth: 2,
                          color: "var(--color-secondary)",
                          "&:hover": {
                            borderColor: "var(--color-secondary)",
                            backgroundColor: "var(--color-faint)",
                          },
                        }
                      : {
                          backgroundColor: "var(--color-primary)",
                          "&:hover": { backgroundColor: "var(--color-btn-hover)" },
                        }),
                  }}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No actions available.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
