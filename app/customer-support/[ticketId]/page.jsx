"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCustomerTicketStore } from "@/store/customerTicketStore";
import { ArrowLeft, Loader2, AlertCircle, Clock, User, Mail, Tag, Paperclip, ExternalLink } from "lucide-react";

const safe = (v) => String(v ?? "").trim();
const upper = (v) => safe(v).toUpperCase();
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

const pill = (status) => {
  const s = upper(status);
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  if (s === "OPEN") return `${base} bg-blue-50 text-blue-700 ring-blue-200`;
  if (s === "IN_PROGRESS") return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
  if (s === "RESOLVED") return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
  if (s === "CLOSED") return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
  return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
};

export default function Page() {
  const { ticketId } = useParams();

  const ticket = useCustomerTicketStore((s) => s.ticket);
  const loading = useCustomerTicketStore((s) => s.loading);
  const error = useCustomerTicketStore((s) => s.error);
  const fetchTicketById = useCustomerTicketStore((s) => s.fetchTicketById);
  const resetTicket = useCustomerTicketStore((s) => s.resetTicket);

  useEffect(() => {
    resetTicket();
    fetchTicketById(ticketId);
    return () => resetTicket();
  }, [ticketId, fetchTicketById, resetTicket]);

  const atts = Array.isArray(ticket?.attachments) ? ticket.attachments : [];

  return (
    <main className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="w-full px-4 md:px-8 py-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin • Support</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Ticket: <span className="text-blue-700">{safe(ticketId)}</span></h1>
            <p className="text-sm text-gray-600">Full ticket details + attachments.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/customer-support" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset bg-white text-gray-900 ring-gray-200 hover:bg-gray-50 transition"><ArrowLeft className="h-4 w-4" /> Back</Link>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition">Admin <ExternalLink className="h-4 w-4" /></Link>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5" /> {error}</div> : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : !ticket ? (
            <div className="text-sm text-gray-600">Ticket not found.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between gap-2">
                  <span className={pill(ticket?.status)}>{upper(ticket?.status).replaceAll("_", " ") || "—"}</span>
                  <span className="text-xs text-gray-600 inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(ticket?.createdAt)}</span>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-600">Subject</p>
                  <p className="mt-1 text-base font-bold text-gray-900">{safe(ticket?.subject) || "-"}</p>
                  <p className="mt-4 text-xs font-semibold text-gray-600">Message</p>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{safe(ticket?.message) || safe(ticket?.description) || "-"}</div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 inline-flex items-center gap-2"><Paperclip className="h-4 w-4" /> Attachments</p>
                    <p className="text-xs text-gray-600">{atts.length} file(s)</p>
                  </div>

                  {!atts.length ? (
                    <p className="mt-2 text-sm text-gray-600">No attachments.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {atts.map((a, idx) => {
                        const url = safe(a?.url || a?.path || a);
                        const name = safe(a?.name) || `Attachment ${idx + 1}`;
                        const isImg = /\.(png|jpg|jpeg|webp|gif)$/i.test(url);
                        return (
                          <a key={`${name}-${idx}`} href={url || "#"} target="_blank" rel="noreferrer" className={`group rounded-xl border border-gray-200 p-3 hover:bg-gray-50 transition ${url ? "" : "pointer-events-none opacity-60"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition">{name}</p>
                                <p className="text-xs text-gray-600 break-all">{url || "—"}</p>
                              </div>
                              <span className="text-[10px] font-semibold rounded-full bg-gray-100 text-gray-700 px-2 py-1">{isImg ? "IMAGE" : "FILE"}</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-sm font-bold text-gray-900">Customer</p>

                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-800"><User className="h-4 w-4 text-gray-400" /> <span className="font-semibold">{safe(ticket?.name) || "-"}</span></div>
                    <div className="flex items-center gap-2 text-sm text-gray-800"><Mail className="h-4 w-4 text-gray-400" /> <span className="break-all">{safe(ticket?.email) || "-"}</span></div>
                    <div className="flex items-center gap-2 text-sm text-gray-800"><Tag className="h-4 w-4 text-gray-400" /> <span>{safe(ticket?.issueType) || "-"}</span></div>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-600">Ticket ID</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 break-all">{safe(ticket?.ticketId) || safe(ticketId) || "-"}</p>
                  </div>

                  {safe(ticket?.adminNotes) ? (
                    <div className="mt-4 rounded-xl border border-gray-200 p-3">
                      <p className="text-xs font-semibold text-gray-600">Admin Notes</p>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{safe(ticket?.adminNotes)}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
