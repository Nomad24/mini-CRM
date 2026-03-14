"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type Conversation = {
  id: string;
  provider: "TELEGRAM" | "WHATSAPP" | "EMAIL" | "WEBHOOK" | "FORM";
  externalChatId: string;
  externalUserId?: string | null;
  externalUsername?: string | null;
  externalName?: string | null;
  externalEmail?: string | null;
  externalPhone?: string | null;
  subject?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  isRead: boolean;
  isResolved: boolean;
  assignedTo?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  contact?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
  lead?: { id: string; title: string; status?: string | null } | null;
  assignee?: { id: string; name: string } | null;
  integration?: { id: string; status: string; name: string } | null;
};

type InboxMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  messageType: "TEXT" | "IMAGE" | "FILE" | "AUDIO" | "VIDEO" | "EMAIL" | "SYSTEM";
  text?: string | null;
  senderName?: string | null;
  senderHandle?: string | null;
  senderEmail?: string | null;
  senderPhone?: string | null;
  subject?: string | null;
  sentAt: string;
};

type ConversationDetail = Conversation & {
  messages: InboxMessage[];
};

type User = { id: string; name: string; email: string };
type Contact = { id: string; name: string; phone: string };
type Lead = { id: string; title: string; status: string };
type Integration = { id: string; provider: string; status: string };

function providerLabel(provider: Conversation["provider"]) {
  if (provider === "TELEGRAM") return "Telegram";
  if (provider === "WHATSAPP") return "WhatsApp";
  if (provider === "EMAIL") return "Email";
  if (provider === "WEBHOOK") return "Webhook";
  return "Form";
}

function providerName(provider: Conversation["provider"]) {
  if (provider === "TELEGRAM") return "Telegram";
  if (provider === "WHATSAPP") return "WhatsApp";
  if (provider === "EMAIL") return "Email";
  if (provider === "WEBHOOK") return "Webhook";
  return "Form";
}

function buildExternalPhone(conversation: Conversation) {
  if (conversation.externalPhone) return conversation.externalPhone;
  const externalKey = conversation.externalUserId || conversation.externalChatId;
  return `ext-${conversation.provider.toLowerCase()}-${externalKey}`.slice(0, 60);
}

export default function InboxPage() {
  const POLL_INTERVAL_MS = 3000;
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [linkedFilter, setLinkedFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [contactPhoneDraft, setContactPhoneDraft] = useState("");
  const [contactEmailDraft, setContactEmailDraft] = useState("");
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [leadTitleDraft, setLeadTitleDraft] = useState("");
  const [leadContactNameDraft, setLeadContactNameDraft] = useState("");
  const [leadPhoneDraft, setLeadPhoneDraft] = useState("");
  const [leadSourceDraft, setLeadSourceDraft] = useState("Telegram");
  const [leadDescriptionDraft, setLeadDescriptionDraft] = useState("");
  const [leadDueDateDraft, setLeadDueDateDraft] = useState("");
  const [linkContactId, setLinkContactId] = useState("");
  const [linkLeadId, setLinkLeadId] = useState("");

  const deferredSearch = useDeferredValue(search);
  const hasConnectedChannels = useMemo(() => integrations.some((i) => i.status === "CONNECTED"), [integrations]);

  const loadConversations = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoadingConversations(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (providerFilter !== "all") params.set("provider", providerFilter);
    if (assignedFilter !== "all") params.set("assignedTo", assignedFilter);
    if (linkedFilter !== "all") params.set("linked", linkedFilter);
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim());

    const res = await fetch(`/api/conversations?${params.toString()}`, { cache: "no-store" });
    if (!silent) setLoadingConversations(false);
    if (!res.ok) {
      showToast("Failed to load conversations", "error");
      return;
    }
    const data = await res.json();
    const list = data.conversations || [];
    setConversations(list);

    if (selectedId && !list.some((item: Conversation) => item.id === selectedId)) {
      setSelectedId("");
      setSelected(null);
    }
  }, [statusFilter, providerFilter, assignedFilter, linkedFilter, deferredSearch, selectedId]);

  const loadDetail = useCallback(async (id: string, { silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoadingDetail(true);
    const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    if (!silent) setLoadingDetail(false);
    if (!res.ok) {
      showToast("Failed to load conversation", "error");
      return;
    }
    const data = await res.json();
    const conversation = data.conversation || null;
    setSelected(conversation);

    if (conversation && !conversation.leadId) {
      const source = providerName(conversation.provider);
      setLeadSourceDraft(source);
      setLeadContactNameDraft(conversation.externalName || conversation.externalUsername || `Chat ${conversation.externalChatId}`);
      setLeadPhoneDraft(buildExternalPhone(conversation));
      const defaultTitle = conversation.subject
        ? conversation.subject
        : conversation.lastMessagePreview
          ? `${source}: ${conversation.lastMessagePreview.slice(0, 60)}`
          : `${source} inquiry`;
      setLeadTitleDraft(defaultTitle);
      setLeadDescriptionDraft(conversation.lastMessagePreview || "");
      setLeadDueDateDraft("");
    }

    setUsers(data.users || []);
  }, []);

  const patchConversationById = useCallback(async (conversationId: string, patch: Record<string, unknown>, options?: { refreshDetail?: boolean }) => {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update conversation", "error");
      return false;
    }

    setConversations((prev) => prev.map((item) => (item.id === conversationId ? { ...item, ...data.conversation } : item)));
    if (selectedId === conversationId) {
      setSelected((prev) => (prev ? { ...prev, ...data.conversation } : prev));
      if (options?.refreshDetail) {
        await loadDetail(conversationId, { silent: true });
      }
    }
    return true;
  }, [loadDetail, selectedId]);

  useEffect(() => {
    async function bootstrap() {
      const [integrationsRes, contactsRes, leadsRes, usersRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/contacts"),
        fetch("/api/leads"),
        fetch("/api/users"),
      ]);

      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data.integrations || []);
      }
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || []);
      }
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

    }
    bootstrap();
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadConversations();
    });
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      queueMicrotask(() => {
        void loadDetail(selectedId);
      });
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const refreshInbox = () => {
      if (document.visibilityState !== "visible") return;
      void loadConversations({ silent: true });
      if (selectedId) {
        void loadDetail(selectedId, { silent: true });
      }
    };

    const intervalId = window.setInterval(refreshInbox, POLL_INTERVAL_MS);
    const onFocus = () => refreshInbox();
    const onVisibilityChange = () => refreshInbox();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadConversations, loadDetail, selectedId, POLL_INTERVAL_MS]);

  const patchConversation = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    const ok = await patchConversationById(selected.id, patch, { refreshDetail: true });
    if (ok) await loadConversations({ silent: true });
  };

  const openContactForm = () => {
    if (!selected) return;
    setContactNameDraft(selected.externalName || selected.externalUsername || `Chat ${selected.externalChatId}`);
    setContactPhoneDraft(buildExternalPhone(selected));
    setContactEmailDraft(selected.externalEmail || "");
    setIsContactFormOpen(true);
  };

  const onCreateLead = async () => {
    if (!selected || isCreatingLead) return;
    if (!leadTitleDraft.trim() || !leadContactNameDraft.trim() || !leadPhoneDraft.trim()) {
      showToast("Title, contact name and phone are required", "error");
      return;
    }

    setIsCreatingLead(true);
    const createLeadRes = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: leadTitleDraft.trim(),
        contactName: leadContactNameDraft.trim(),
        phone: leadPhoneDraft.trim(),
        source: leadSourceDraft.trim() || providerName(selected.provider),
        description: leadDescriptionDraft.trim() || null,
        dueDate: leadDueDateDraft || null,
      }),
    });

    const createLeadData = await createLeadRes.json();
    if (!createLeadRes.ok) {
      setIsCreatingLead(false);
      showToast(createLeadData.error || "Failed to create lead", "error");
      return;
    }

    const createdLeadId = createLeadData?.lead?.id;
    if (!createdLeadId) {
      setIsCreatingLead(false);
      showToast("Lead created but linking failed", "error");
      return;
    }

    const linkLeadRes = await fetch(`/api/conversations/${selected.id}/link-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: createdLeadId }),
    });
    const linkLeadData = await linkLeadRes.json();
    setIsCreatingLead(false);

    if (!linkLeadRes.ok) {
      showToast(linkLeadData.error || "Lead created, but failed to link conversation", "error");
      return;
    }

    showToast("Lead created", "success");
    setIsLeadFormOpen(false);
    await loadDetail(selected.id);
    await loadConversations();
  };

  const onCreateContact = async () => {
    if (!selected || isCreatingContact) return;
    if (!contactNameDraft.trim() || !contactPhoneDraft.trim()) {
      showToast("Name and phone are required", "error");
      return;
    }

    setIsCreatingContact(true);
    const createContactRes = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contactNameDraft.trim(),
        phone: contactPhoneDraft.trim(),
        email: contactEmailDraft.trim() || null,
      }),
    });

    const createContactData = await createContactRes.json();
    if (!createContactRes.ok) {
      setIsCreatingContact(false);
      showToast(createContactData.error || "Failed to create contact", "error");
      return;
    }

    const createdContactId = createContactData?.contact?.id;
    if (!createdContactId) {
      setIsCreatingContact(false);
      showToast("Contact created but linking failed", "error");
      return;
    }

    const linkContactRes = await fetch(`/api/conversations/${selected.id}/link-contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: createdContactId }),
    });
    const linkContactData = await linkContactRes.json();
    setIsCreatingContact(false);

    if (!linkContactRes.ok) {
      showToast(linkContactData.error || "Contact created, but failed to link conversation", "error");
      return;
    }

    setIsContactFormOpen(false);
    showToast("Contact created", "success");
    await loadDetail(selected.id);
    await loadConversations();
  };

  const onLinkContact = async () => {
    if (!selected || !linkContactId) return;
    const res = await fetch(`/api/conversations/${selected.id}/link-contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: linkContactId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to link contact", "error");
      return;
    }
    showToast("Contact linked", "success");
    await loadDetail(selected.id);
    await loadConversations();
  };

  const onLinkLead = async () => {
    if (!selected || !linkLeadId) return;
    const res = await fetch(`/api/conversations/${selected.id}/link-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: linkLeadId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to link lead", "error");
      return;
    }
    showToast("Lead linked", "success");
    await loadDetail(selected.id);
    await loadConversations();
  };

  const onUnlinkContact = async () => {
    if (!selected?.contactId) return;
    const res = await fetch(`/api/conversations/${selected.id}/unlink-contact`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to unlink contact", "error");
      return;
    }
    showToast("Contact unlinked", "success");
    await loadDetail(selected.id);
    await loadConversations();
  };

  const onUnlinkLead = async () => {
    if (!selected?.leadId) return;
    const res = await fetch(`/api/conversations/${selected.id}/unlink-lead`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to unlink lead", "error");
      return;
    }
    showToast("Lead unlinked", "success");
    await loadDetail(selected.id);
    await loadConversations();
  };

  const onSendReply = async () => {
    if (!selected || isSendingReply) return;
    const text = replyText.trim();
    if (!text) return;

    setIsSendingReply(true);
    const res = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setIsSendingReply(false);

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to send message", "error");
      return;
    }

    setReplyText("");
    showToast("Message sent", "success");
    await loadDetail(selected.id, { silent: true });
    await loadConversations({ silent: true });
  };

  const canReply = Boolean(selected && selected.provider === "TELEGRAM" && selected.integration?.status === "CONNECTED");

  const conversationDisplayTitle = (conversation: Conversation) => {
    if (conversation.provider === "EMAIL") {
      return conversation.subject || conversation.externalName || conversation.externalEmail || conversation.externalChatId;
    }
    return conversation.externalName || conversation.externalUsername || conversation.externalChatId;
  };

  const statusSummary = (conversation: ConversationDetail) => {
    const linkedText = conversation.leadId
      ? "Linked to lead"
      : conversation.contactId
        ? "Linked to contact"
        : "Unlinked";
    const assignedText = conversation.assignee?.name ? `Assigned to ${conversation.assignee.name}` : "Unassigned";
    const resolvedText = conversation.isResolved ? "Resolved" : "Open";
    return `${providerLabel(conversation.provider)} · ${linkedText} · ${assignedText} · ${resolvedText}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
        <div className="mt-2 text-sm text-slate-400">Live updates every 3 seconds while this tab is open.</div>

        {!hasConnectedChannels ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
            <h2 className="text-lg font-semibold">No channels connected yet</h2>
            <p className="mt-1 text-sm text-slate-400">Connect Telegram, WhatsApp, or Email to start receiving inbound messages.</p>
            <Link href="/settings/integrations" className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm text-white">Open integrations</Link>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 md:grid-cols-5">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="resolved">Resolved</option>
                <option value="unresolved">Unresolved</option>
              </select>
              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                <option value="all">All providers</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
              <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={linkedFilter} onChange={(e) => setLinkedFilter(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                <option value="all">Linked + unlinked</option>
                <option value="linked">Linked</option>
                <option value="unlinked">Unlinked</option>
              </select>
              <div className="flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, subject, preview" className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <section className="lg:col-span-4 rounded-xl border border-slate-700 bg-slate-900">
                <div className="border-b border-slate-700 px-4 py-3 text-sm text-slate-300">Conversations</div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {loadingConversations ? (
                    <div className="p-4 text-sm text-slate-400">Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400">No conversations yet</div>
                  ) : (
                    conversations.map((conversation) => {

                      const isLinked = Boolean(conversation.contactId || conversation.leadId);
                      return (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            setSelectedId(conversation.id);
                            setIsLeadFormOpen(false);
                            setIsContactFormOpen(false);
                            setLinkContactId("");
                            setLinkLeadId("");
                          }}
                          className={selectedId === conversation.id ? "w-full border-b border-slate-800 bg-slate-800/90 p-3 text-left ring-1 ring-inset ring-slate-600" : "w-full border-b border-slate-800 p-3 text-left hover:bg-slate-800/60"}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {!conversation.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-transparent" />}
                                <div className="truncate font-medium text-slate-100">{conversationDisplayTitle(conversation)}</div>
                              </div>
                              {conversation.provider === "EMAIL" && conversation.externalEmail && (
                                <div className="mt-0.5 truncate text-[11px] text-slate-500">{conversation.externalEmail}</div>
                              )}
                              {conversation.provider === "WHATSAPP" && conversation.externalPhone && (
                                <div className="mt-0.5 truncate text-[11px] text-slate-500">{conversation.externalPhone}</div>
                              )}
                              <div className="mt-1 line-clamp-2 text-xs text-slate-400">{conversation.lastMessagePreview || "No messages yet"}</div>
                            </div>
                            <div className="shrink-0 text-[11px] text-slate-500">{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{providerLabel(conversation.provider)}</span>
                            {!conversation.isRead ? <span className="rounded-full border border-blue-900 bg-blue-950 px-2 py-0.5 text-[10px] text-blue-300">Unread</span> : null}
                            {conversation.isResolved ? <span className="rounded-full border border-emerald-900 bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">Resolved</span> : null}
                            <span className={isLinked ? "rounded-full border border-amber-900 bg-amber-950 px-2 py-0.5 text-[10px] text-amber-300" : "rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400"}>{isLinked ? "Linked" : "Unlinked"}</span>
                            {conversation.assignee?.name ? <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">{conversation.assignee.name}</span> : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="lg:col-span-8 rounded-xl border border-slate-700 bg-slate-900">
                {!selectedId ? (
                  <div className="p-6 text-sm text-slate-400">
                    <div className="text-base font-medium text-slate-200">Select a conversation</div>
                    <div className="mt-1">Choose a conversation on the left to view details, CRM links, timeline, and reply composer.</div>
                  </div>
                ) : loadingDetail ? (
                  <div className="p-6 text-sm text-slate-400">Loading conversation...</div>
                ) : !selected ? (
                  <div className="p-6 text-sm text-slate-400">Conversation not found</div>
                ) : (
                  <>
                    <div className="border-b border-slate-700 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">
                            {selected.provider === "EMAIL"
                              ? (selected.subject || selected.externalName || selected.externalEmail || selected.externalChatId)
                              : (selected.externalName || selected.externalUsername || selected.externalChatId)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {providerLabel(selected.provider)}
                            {selected.provider === "WHATSAPP" && selected.externalPhone ? ` · ${selected.externalPhone}` : ""}
                            {selected.provider === "EMAIL" && selected.externalEmail ? ` · ${selected.externalEmail}` : ""}
                            {selected.provider !== "EMAIL" && selected.provider !== "WHATSAPP" ? ` · Chat ID: ${selected.externalChatId}` : ""}
                            {selected.provider === "EMAIL" ? ` · Thread ID: ${selected.externalChatId}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{statusSummary(selected)}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!selected.isRead ? <span className="rounded-md border border-blue-900 bg-blue-950 px-2 py-1 text-[11px] text-blue-300">Unread</span> : <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">Read</span>}
                          {selected.isResolved ? <span className="rounded-md border border-emerald-900 bg-emerald-950 px-2 py-1 text-[11px] text-emerald-300">Resolved</span> : <span className="rounded-md border border-amber-900 bg-amber-950 px-2 py-1 text-[11px] text-amber-300">Open</span>}
                          <span className={selected.contactId || selected.leadId ? "rounded-md border border-amber-900 bg-amber-950 px-2 py-1 text-[11px] text-amber-300" : "rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"}>{selected.contactId || selected.leadId ? "Linked" : "Unlinked"}</span>
                          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">{selected.assignee?.name ? `Assigned: ${selected.assignee.name}` : "Unassigned"}</span>
                          <button onClick={() => patchConversation({ isRead: !selected.isRead })} className="rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300">{selected.isRead ? "Mark unread" : "Mark read"}</button>
                          <button onClick={() => patchConversation({ isResolved: !selected.isResolved })} className="rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300">{selected.isResolved ? "Reopen" : "Resolve"}</button>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-slate-700 p-4">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">CRM panel</div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
                          <div className="text-slate-400">Linked contact</div>
                          {selected.contactId && selected.contact ? (
                            <>
                              <div className="mt-1 text-slate-100">{selected.contact.name}</div>
                              <div className="mt-1 text-[11px] text-slate-400">{selected.contact.phone || selected.contact.email || "No contact details"}</div>
                              <div className="mt-2 flex gap-2">
                                <Link href={`/contacts/${selected.contact.id}`} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">Open</Link>
                                <button onClick={onUnlinkContact} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">Unlink</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mt-1 text-slate-300">Not linked</div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={openContactForm} className="rounded-md bg-blue-600 px-2 py-1 text-[11px] text-white">Create contact</button>
                              </div>
                            </>
                          )}

                          {isContactFormOpen && !selected.contactId ? (
                            <div className="mt-2 rounded-md border border-slate-700 bg-slate-900 p-2">
                              <div className="mb-2 text-[11px] font-semibold text-slate-200">Create contact</div>
                              <div className="grid gap-2">
                                <input value={contactNameDraft} onChange={(event) => setContactNameDraft(event.target.value)} placeholder="Name" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-100" />
                                <input value={contactPhoneDraft} onChange={(event) => setContactPhoneDraft(event.target.value)} placeholder="Phone" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-100" />
                                <input value={contactEmailDraft} onChange={(event) => setContactEmailDraft(event.target.value)} placeholder="Email (optional)" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-100" />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={onCreateContact} disabled={isCreatingContact} className="rounded-md bg-blue-600 px-2 py-1 text-[11px] text-white disabled:opacity-60">{isCreatingContact ? "Creating..." : "Create"}</button>
                                <button onClick={() => setIsContactFormOpen(false)} disabled={isCreatingContact} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">Cancel</button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
                          <div className="text-slate-400">Linked lead</div>
                          {selected.leadId && selected.lead ? (
                            <>
                              <div className="mt-1 text-slate-100">{selected.lead.title}</div>
                              <div className="mt-1 text-[11px] text-slate-400">Status: {selected.lead.status || "—"}</div>
                              <div className="mt-2 flex gap-2">
                                <Link href={`/leads/${selected.lead.id}`} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">Open</Link>
                                <button onClick={onUnlinkLead} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">Unlink</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mt-1 text-slate-300">Not linked</div>
                              {!isLeadFormOpen ? (
                                <button onClick={() => setIsLeadFormOpen(true)} className="mt-2 rounded-md bg-blue-600 px-2 py-1 text-[11px] text-white">Create lead</button>
                              ) : null}
                            </>
                          )}
                        </div>

                        <div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
                          <div className="text-slate-400">Assignment</div>
                          <div className="mt-1 text-slate-300">{selected.assignee?.name || "Unassigned"}</div>
                          <div className="mt-2">
                            <select value={selected.assignedTo || ""} onChange={(e) => patchConversation({ assignedTo: e.target.value || null })} className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                              <option value="">Unassigned</option>
                              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {!selected.leadId && isLeadFormOpen ? (
                        <div className="mt-3 rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
                          <div className="mb-2 text-sm font-semibold text-slate-200">Create lead</div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <input value={leadTitleDraft} onChange={(event) => setLeadTitleDraft(event.target.value)} placeholder="Title" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100" />
                            <input value={leadSourceDraft} onChange={(event) => setLeadSourceDraft(event.target.value)} placeholder="Source" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100" />
                            <input value={leadContactNameDraft} onChange={(event) => setLeadContactNameDraft(event.target.value)} placeholder="Contact name" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100" />
                            <input value={leadPhoneDraft} onChange={(event) => setLeadPhoneDraft(event.target.value)} placeholder="Phone" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100" />
                            <input type="date" value={leadDueDateDraft} onChange={(event) => setLeadDueDateDraft(event.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100" />
                            <input value={leadDescriptionDraft} onChange={(event) => setLeadDescriptionDraft(event.target.value)} placeholder="Description" className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-100" />
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={onCreateLead} disabled={isCreatingLead} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-60">{isCreatingLead ? "Creating..." : "Create"}</button>
                            <button onClick={() => setIsLeadFormOpen(false)} disabled={isCreatingLead} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">
                        <div className="text-slate-400">Link existing</div>
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <select value={linkContactId} onChange={(e) => setLinkContactId(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                              <option value="">{selected.contactId ? "Change contact" : "Select contact"}</option>
                              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                            </select>
                            <button onClick={onLinkContact} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs">Link</button>
                          </div>
                          <div className="flex gap-2">
                            <select value={linkLeadId} onChange={(e) => setLinkLeadId(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                              <option value="">{selected.leadId ? "Change lead" : "Select lead"}</option>
                              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title}</option>)}
                            </select>
                            <button onClick={onLinkLead} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs">Link</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(2,6,23,0.8))] p-4">
                      {selected.messages.length === 0 ? (
                        <div className="text-sm text-slate-400">No messages yet</div>
                      ) : (
                        <div className="space-y-2.5">
                          {selected.messages.map((message) => (
                            <div key={message.id} className={message.direction === "OUTBOUND" ? "ml-auto max-w-[80%] rounded-2xl rounded-br-md border border-blue-900/50 bg-blue-950/70 px-3 py-2.5" : "mr-auto max-w-[80%] rounded-2xl rounded-bl-md border border-slate-700 bg-slate-950/95 px-3 py-2.5"}>
                              <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500">
                                <span className={message.direction === "OUTBOUND" ? "rounded-full border border-blue-800/60 bg-blue-900/40 px-1.5 py-0.5 text-[10px] text-blue-200" : "rounded-full border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300"}>{message.direction === "OUTBOUND" ? "Outbound" : "Inbound"}</span>
                                <span>{new Date(message.sentAt).toLocaleString()}</span>
                              </div>
                              {message.subject ? <div className="mt-1 text-xs font-semibold text-slate-300">Subject: {message.subject}</div> : null}
                              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{message.text || `[${message.messageType}]`}</div>
                              {(message.senderName || message.senderHandle || message.senderEmail || message.senderPhone) ? (
                                <div className="mt-2 text-[11px] text-slate-500">
                                  {message.senderName || "Unknown sender"}
                                  {message.senderEmail ? ` · ${message.senderEmail}` : ""}
                                  {message.senderPhone ? ` · ${message.senderPhone}` : ""}
                                  {message.senderHandle ? ` · @${message.senderHandle}` : ""}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-700 bg-slate-950/80 p-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{selected ? `Reply via ${providerLabel(selected.provider)}` : "Reply"}</span>
                        {selected.integration?.name ? <span>{selected.integration.name}</span> : null}
                      </div>
                      <div className="flex gap-3">
                        <textarea
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                              event.preventDefault();
                              void onSendReply();
                            }
                          }}
                          disabled={!canReply || isSendingReply}
                          rows={3}
                          placeholder={canReply ? "Reply to this conversation..." : "Replies are currently available for connected Telegram conversations"}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <button
                          onClick={() => void onSendReply()}
                          disabled={!canReply || isSendingReply || !replyText.trim()}
                          className="self-end rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSendingReply ? "Sending..." : "Send"}
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">Shortcut: Ctrl + Enter to send</div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
