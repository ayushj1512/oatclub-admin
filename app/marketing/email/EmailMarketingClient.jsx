"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Upload,
  Plus,
  Search,
  Trash2,
  Send,
  FileText,
  CheckCircle2,
} from "lucide-react";

/* ---------------- utils ---------------- */
const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const uniqLower = (emails) => {
  const seen = new Set();
  const out = [];
  for (const e of emails || []) {
    const v = String(e || "").trim().toLowerCase();
    if (!v || !validEmail(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
};

const extractEmailsFromCsvText = (csvText) => {
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const matches = String(csvText || "").match(emailRegex) || [];
  return uniqLower(matches);
};

const downloadTextFile = (filename, content, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const emailsToCsv = (emails) => {
  const header = "email\n";
  const rows = (emails || [])
    .map((e) => `"${String(e).replaceAll('"', '""')}"`)
    .join("\n");
  return header + rows + "\n";
};

const safeDateLabel = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export default function EmailMarketingClient() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
  const NEWSLETTER_API = `${API_BASE}/api/newsletters/subscribers`;
  const SEND_API = `${API_BASE}/api/marketing/email/send`;

  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [globalFilter, setGlobalFilter] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const fileInputRef = useRef(null);

  /* ---------------- templates (hardcoded) ---------------- */
  const templates = useMemo(
    () => [
      {
        id: "welcome-01",
        name: "Welcome",
        subject: "Welcome to OATCLUB 💛",
        html: `<h2>Welcome!</h2><p>Thanks for joining OATCLUB.</p>`,
      },
      {
        id: "sale-01",
        name: "Sale Blast",
        subject: "Flat Discounts Live 🔥",
        html: `<h2>Sale is Live!</h2><p>Shop your favorites now.</p>`,
      },
      {
        id: "new-arrivals-01",
        name: "New Arrivals",
        subject: "New Arrivals just dropped ✨",
        html: `<h2>New Arrivals</h2><p>Fresh styles are live now.</p>`,
      },
    ],
    []
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [subjectOverride, setSubjectOverride] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const effectiveSubject = subjectOverride.trim() || selectedTemplate?.subject || "";

  /* ---------------- fetch subscribers ---------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(NEWSLETTER_API, { cache: "no-store" });
        const json = await res.json();

        const list = Array.isArray(json)
          ? json
          : Array.isArray(json?.subscribers)
          ? json.subscribers
          : [];

        if (!alive) return;

        const normalized = (list || [])
          .filter((x) => x?.email)
          .map((x) => ({ ...x, email: String(x.email).trim().toLowerCase() }));

        setSubscribers(normalized);
      } catch (e) {
        console.error("Newsletter fetch error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [NEWSLETTER_API]);

  /* ---------------- derived ---------------- */
  const filtered = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) =>
      String(s.email || "").toLowerCase().includes(q)
    );
  }, [subscribers, globalFilter]);

  const allEmails = useMemo(() => uniqLower(subscribers.map((s) => s.email)), [subscribers]);

  /* ---------------- selection helpers ---------------- */
  const toggleSelectEmail = (email) => {
    const e = String(email || "").trim().toLowerCase();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      filtered.forEach((s) => next.add(String(s.email).toLowerCase()));
      return next;
    });
  };

  const clearSelection = () => setSelectedEmails(new Set());

  /* ---------------- manual add ---------------- */
  const addSubscriber = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!validEmail(email)) return alert("Invalid email format");

    setAdding(true);
    try {
      const res = await fetch(NEWSLETTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json?.message || "Failed to add");
        return;
      }

      const sub = json?.subscription || json;
      const next = {
        ...(sub || {}),
        email: String(sub?.email || email).trim().toLowerCase(),
      };

      setSubscribers((prev) => {
        const exists = prev.some((x) => x.email === next.email);
        return exists ? prev : [next, ...prev];
      });

      setNewEmail("");
    } catch {
      alert("Network error");
    } finally {
      setAdding(false);
    }
  };

  /* ---------------- import CSV ---------------- */
  const onImportCsv = async (file) => {
    if (!file) return;
    setImporting(true);
    setSendResult("");

    try {
      const text = await file.text();
      const emails = extractEmailsFromCsvText(text);

      if (!emails.length) {
        alert("No valid emails found in CSV.");
        return;
      }

      // merge locally
      setSubscribers((prev) => {
        const existing = new Set(prev.map((x) => String(x.email).toLowerCase()));
        const added = [];
        emails.forEach((e) => {
          if (existing.has(e)) return;
          added.push({
            email: e,
            isActive: true,
            isVerified: false,
            subscribedAt: new Date().toISOString(),
          });
        });
        return [...added, ...prev];
      });

      // auto select imported
      setSelectedEmails((prev) => {
        const next = new Set(prev);
        emails.forEach((e) => next.add(e));
        return next;
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ---------------- export CSV ---------------- */
  const exportCsv = (onlySelected) => {
    const emails = onlySelected ? [...selectedEmails] : allEmails;
    const csv = emailsToCsv(uniqLower(emails));
    downloadTextFile(
      onlySelected ? "newsletter_selected_emails.csv" : "newsletter_all_emails.csv",
      csv,
      "text/csv;charset=utf-8"
    );
  };

  /* ---------------- send campaign ---------------- */
  const sendCampaign = async () => {
    setSendResult("");

    if (!selectedTemplate) return alert("Select a template first.");
    if (!effectiveSubject.trim()) return alert("Subject is required.");
    if (selectedEmails.size === 0) return alert("Select at least 1 email.");

    setSending(true);
    try {
      const payload = {
        templateId: selectedTemplate.id,
        subject: effectiveSubject,
        emails: [...selectedEmails],
        html: selectedTemplate.html,
      };

      const res = await fetch(SEND_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSendResult(json?.message || "Failed to send campaign.");
        return;
      }

      setSendResult(json?.message || `Sent to ${selectedEmails.size} emails ✅`);
      clearSelection();
    } catch (e) {
      console.error(e);
      setSendResult("Network error while sending.");
    } finally {
      setSending(false);
    }
  };

  /* ---------------- UI helpers ---------------- */
  const Card = ({ children, className = "" }) => (
    <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}>
      {children}
    </div>
  );

  const SoftInputWrap = ({ children }) => (
    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-black/5">
      {children}
    </div>
  );

  const SoftButton = ({ className = "", ...props }) => (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm transition active:scale-[0.99] disabled:opacity-50 ${className}`}
    />
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-3xl font-bold text-zinc-950">Email Studio</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Import, segment, preview, and send curated messages with OATCLUB tone.
        </p>
      </motion.div>

      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Search + selection */}
        <Card className="p-4">
          <SoftInputWrap>
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search email..."
              className="w-full outline-none text-sm bg-transparent"
            />
          </SoftInputWrap>

          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-gray-600">
              Showing <b>{filtered.length}</b> / {subscribers.length}
            </span>
            <span className="text-gray-600">
              Selected: <b>{selectedEmails.size}</b>
            </span>
          </div>

          <div className="flex gap-2 mt-3">
            <SoftButton
              onClick={selectAllFiltered}
              className="flex-1 bg-gray-50 hover:bg-gray-100"
            >
              Select visible
            </SoftButton>
            <SoftButton
              onClick={clearSelection}
              className="bg-gray-50 hover:bg-gray-100 px-3"
              title="Clear selection"
            >
              <Trash2 className="w-4 h-4" />
            </SoftButton>
          </div>
        </Card>

        {/* Import / Export */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Import / Export</h2>
            {importing && <span className="text-xs text-gray-500">Importing...</span>}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 px-3 py-2 cursor-pointer text-sm ring-1 ring-black/5">
              <Upload className="w-4 h-4" />
              Import CSV
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onImportCsv(e.target.files?.[0] || null)}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <SoftButton
                onClick={() => exportCsv(false)}
                className="bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export all
              </SoftButton>

              <SoftButton
                onClick={() => exportCsv(true)}
                disabled={selectedEmails.size === 0}
                className="bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Selected
              </SoftButton>
            </div>
          </div>
        </Card>

        {/* Manual add */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900">Add Email</h2>

          <div className="mt-3 flex gap-2">
            <SoftInputWrap>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full outline-none text-sm bg-transparent"
              />
            </SoftInputWrap>

            <SoftButton
              onClick={addSubscriber}
              disabled={adding}
              className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add"}
            </SoftButton>
          </div>
        </Card>
      </div>

      {/* Templates + Send */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Template select */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Templates</h2>
            <span className="text-xs text-gray-500">{templates.length} templates</span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3">
              <label className="text-xs text-gray-600">Choose template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-black/5"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <label className="text-xs text-gray-600 mt-3 block">Subject</label>
              <input
                value={subjectOverride}
                onChange={(e) => setSubjectOverride(e.target.value)}
                placeholder={selectedTemplate?.subject || "Subject..."}
                className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-black/5"
              />

              <p className="text-[11px] text-gray-500 mt-2">
                Leave empty to use template subject.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600">Template preview</label>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> HTML
                </span>
              </div>

              <div className="mt-2 h-40 overflow-auto rounded-xl bg-white p-3 text-xs ring-1 ring-black/5">
                {selectedTemplate ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedTemplate.html }} />
                ) : (
                  <span className="text-gray-500">No template selected.</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Send panel */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900">Send Campaign</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Template</span>
              <span className="font-medium">{selectedTemplate?.name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subject</span>
              <span className="font-medium text-right max-w-[60%] truncate" title={effectiveSubject}>
                {effectiveSubject || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Recipients</span>
              <span className="font-medium">{selectedEmails.size}</span>
            </div>
          </div>

          <SoftButton
            onClick={sendCampaign}
            disabled={sending || selectedEmails.size === 0 || !selectedTemplate}
            className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Email"}
          </SoftButton>

          {sendResult && (
            <div className="mt-3 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <span className="text-gray-700">{sendResult}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Subscribers table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Subscribers</h2>
          {loading ? <span className="text-xs text-gray-500">Loading…</span> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-800">
            <thead className="bg-gray-50">
              <tr className="text-gray-600">
                <th className="p-3 text-left w-[44px]"> </th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Verified</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Subscribed On</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No subscribers found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const email = String(s.email || "").toLowerCase();
                  const checked = selectedEmails.has(email);

                  return (
                    <tr key={email} className="hover:bg-gray-50 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectEmail(email)}
                          className="w-4 h-4"
                        />
                      </td>

                      <td className="p-3 font-medium text-gray-900">{email}</td>

                      <td className="p-3">
                        {s.isVerified ? (
                          <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                            Yes
                          </span>
                        ) : (
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
                            No
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {s.isActive !== false ? (
                          <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                            Active
                          </span>
                        ) : (
                          <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full text-xs">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-gray-600">{safeDateLabel(s.subscribedAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            Total: <b className="text-gray-900">{subscribers.length}</b>
          </span>
          <span>
            Selected: <b className="text-gray-900">{selectedEmails.size}</b>
          </span>
        </div>
      </Card>
    </div>
  );
}
