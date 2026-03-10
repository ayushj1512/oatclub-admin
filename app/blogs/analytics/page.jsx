// app/blogs/analytics/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  Hash,
  Image as ImageIcon,
  Layers3,
  PencilLine,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useAdminBlogStore } from "@/store/adminBlogStore";

/* ---------------------------------------
   helpers
--------------------------------------- */
const safe = (v) => (v == null ? "" : String(v));
const s = (v) => safe(v).trim();
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return safe(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return safe(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const wordCount = (text) => s(text).split(/\s+/).filter(Boolean).length;
const readingTime = (text) => Math.max(1, Math.ceil(wordCount(text) / 200));

const slugQuality = (slug) => {
  const value = s(slug);
  if (!value) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
};

const excerptQuality = (excerpt) => {
  const len = s(excerpt).length;
  return len >= 80 && len <= 180;
};

const titleQuality = (title) => {
  const len = s(title).length;
  return len >= 30 && len <= 70;
};

const contentQuality = (content) => wordCount(content) >= 300;

const calcCompleteness = (blog) => {
  if (!blog) return 0;
  const checks = [
    !!s(blog.title),
    !!s(blog.slug),
    !!s(blog.excerpt),
    !!s(blog.image),
    !!s(blog.category),
    Array.isArray(blog.tags) && blog.tags.length > 0,
    !!s(blog.content),
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
};

const isThisMonth = (value) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
};

const isThisWeek = (value) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return d >= start && d < end;
};

const monthKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
};

/* ---------------------------------------
   UI
--------------------------------------- */
function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-neutral-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-2.5 text-neutral-700">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, accent = "neutral" }) {
  const accentMap = {
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          <h3 className="mt-2 text-2xl font-semibold text-neutral-900">
            {value}
          </h3>
          {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
        </div>
        <div
          className={`rounded-2xl border p-3 ${accentMap[accent] || accentMap.neutral}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function TinyBarList({ items = [], valueKey = "value", labelKey = "label" }) {
  const max = Math.max(...items.map((i) => n(i[valueKey])), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const val = n(item[valueKey]);
        const pct = Math.max(6, Math.round((val / max) * 100));

        return (
          <div key={item[labelKey]}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-neutral-700">{item[labelKey]}</span>
              <span className="font-medium text-neutral-900">{val}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-neutral-900"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-neutral-200 py-3 last:border-b-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function QualityItem({ ok, label, note }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div
        className={`mt-0.5 rounded-full p-1 ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }`}
      >
        {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {note ? <p className="mt-1 text-xs text-neutral-500">{note}</p> : null}
      </div>
    </div>
  );
}

/* ---------------------------------------
   page
--------------------------------------- */
export default function BlogAnalyticsPage() {
  const { blogs, loading, fetchBlogs } = useAdminBlogStore();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetchBlogs({ page: 1, limit: 500 });
  }, [fetchBlogs]);

  const filteredBlogs = useMemo(() => {
    return (blogs || []).filter((blog) => {
      const title = s(blog?.title).toLowerCase();
      const slug = s(blog?.slug).toLowerCase();
      const category = s(blog?.category).toLowerCase();
      const tags = Array.isArray(blog?.tags)
        ? blog.tags.join(" ").toLowerCase()
        : "";

      const q = s(query).toLowerCase();
      const matchesQuery =
        !q ||
        title.includes(q) ||
        slug.includes(q) ||
        category.includes(q) ||
        tags.includes(q);

      const matchesStatus =
        status === "all"
          ? true
          : status === "published"
          ? !!blog?.isPublished
          : !blog?.isPublished;

      return matchesQuery && matchesStatus;
    });
  }, [blogs, query, status]);

  const selectedBlog = useMemo(() => {
    if (!filteredBlogs.length) return null;
    return (
      filteredBlogs.find((b) => String(b?._id) === String(selectedId)) ||
      filteredBlogs[0]
    );
  }, [filteredBlogs, selectedId]);

  useEffect(() => {
    if (!selectedId && filteredBlogs[0]?._id) {
      setSelectedId(filteredBlogs[0]._id);
    } else if (
      selectedId &&
      !filteredBlogs.some((b) => String(b._id) === String(selectedId))
    ) {
      setSelectedId(filteredBlogs[0]?._id || "");
    }
  }, [filteredBlogs, selectedId]);

  const analytics = useMemo(() => {
    const items = filteredBlogs || [];

    const totalBlogs = items.length;
    const publishedCount = items.filter((b) => !!b?.isPublished).length;
    const draftCount = totalBlogs - publishedCount;
    const withImage = items.filter((b) => !!s(b?.image)).length;
    const withContent = items.filter((b) => !!s(b?.content)).length;
    const withProducts = items.filter(
      (b) => Array.isArray(b?.products) && b.products.length > 0
    ).length;
    const withAuthor = items.filter((b) => !!b?.author).length;
    const createdThisMonth = items.filter(
      (b) => isThisMonth(b?.createdAt) || isThisMonth(b?.date)
    ).length;
    const updatedThisWeek = items.filter((b) => isThisWeek(b?.updatedAt)).length;

    const totalWords = items.reduce((sum, b) => sum + wordCount(b?.content), 0);
    const totalReadTime = items.reduce((sum, b) => sum + readingTime(b?.content), 0);

    const avgWords = totalBlogs ? Math.round(totalWords / totalBlogs) : 0;
    const avgReadTime = totalBlogs ? Math.round(totalReadTime / totalBlogs) : 0;
    const avgTags = totalBlogs
      ? (
          items.reduce((sum, b) => sum + (Array.isArray(b?.tags) ? b.tags.length : 0), 0) /
          totalBlogs
        ).toFixed(1)
      : "0.0";

    const categoryMap = {};
    const tagMap = {};
    const monthMap = {};

    items.forEach((blog) => {
      const category = s(blog?.category) || "Uncategorized";
      categoryMap[category] = (categoryMap[category] || 0) + 1;

      (blog?.tags || []).forEach((tag) => {
        const key = s(tag);
        if (!key) return;
        tagMap[key] = (tagMap[key] || 0) + 1;
      });

      const mk = monthKey(blog?.createdAt || blog?.date);
      monthMap[mk] = (monthMap[mk] || 0) + 1;
    });

    const topCategories = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const topTags = Object.entries(tagMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const monthlyPublishing = Object.entries(monthMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => new Date(`01 ${a.label}`) - new Date(`01 ${b.label}`))
      .slice(-6);

    const lastUpdated = [...items]
      .filter((b) => b?.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

    return {
      totalBlogs,
      publishedCount,
      draftCount,
      withImage,
      withContent,
      withProducts,
      withAuthor,
      createdThisMonth,
      updatedThisWeek,
      totalWords,
      avgWords,
      avgReadTime,
      avgTags,
      topCategories,
      topTags,
      monthlyPublishing,
      lastUpdated,
    };
  }, [filteredBlogs]);

  const selectedStats = useMemo(() => {
    if (!selectedBlog) return null;

    const title = s(selectedBlog?.title);
    const excerpt = s(selectedBlog?.excerpt);
    const content = s(selectedBlog?.content);
    const tags = Array.isArray(selectedBlog?.tags) ? selectedBlog.tags : [];

    return {
      wordCount: wordCount(content),
      readTime: readingTime(content),
      excerptLength: excerpt.length,
      titleLength: title.length,
      tagCount: tags.length,
      productCount: Array.isArray(selectedBlog?.products)
        ? selectedBlog.products.length
        : 0,
      completeness: calcCompleteness(selectedBlog),
      hasImage: !!s(selectedBlog?.image),
      hasAuthor: !!selectedBlog?.author,
      hasCategory: !!s(selectedBlog?.category),
      hasDate: !!s(selectedBlog?.date),
      hasContent: !!content,
      hasExcerpt: !!excerpt,
      goodSlug: slugQuality(selectedBlog?.slug),
      goodExcerpt: excerptQuality(selectedBlog?.excerpt),
      goodTitle: titleQuality(selectedBlog?.title),
      goodContent: contentQuality(selectedBlog?.content),
    };
  }, [selectedBlog]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto  px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-neutral-200 bg-gradient-to-r from-white via-neutral-50 to-neutral-100 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
                  <Sparkles size={14} />
                  Blog Analytics Dashboard
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                  Overall metrics, content health and blog-level insights
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-neutral-500">
                  Track publishing status, category spread, content depth, tag
                  usage, SEO readiness and individual blog quality from one place.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Scope
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {analytics.totalBlogs} blog
                    {analytics.totalBlogs === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Last Updated
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {analytics.lastUpdated
                      ? formatDateTime(analytics.lastUpdated.updatedAt)
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_240px]">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, slug, category or tags"
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-neutral-400"
                />
              </div>

              <div className="relative">
                <Filter
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-neutral-400"
                >
                  <option value="all">All statuses</option>
                  <option value="published">Published only</option>
                  <option value="draft">Draft only</option>
                </select>
              </div>

              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-neutral-400"
              >
                {(filteredBlogs || []).map((blog) => (
                  <option key={blog._id} value={blog._id}>
                    {s(blog.title) || "Untitled Blog"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-neutral-100" />
            ))}
          </div>
        ) : (
          <>
            {/* Overall Metrics */}
            <div className="mb-6">
              <SectionTitle
                icon={TrendingUp}
                title="Overall Metrics"
                subtitle="High-level performance and content coverage"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={BookOpen}
                  label="Total Blogs"
                  value={analytics.totalBlogs}
                  hint="Current filtered dataset"
                  accent="neutral"
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="Published"
                  value={analytics.publishedCount}
                  hint={`${analytics.totalBlogs ? Math.round((analytics.publishedCount / analytics.totalBlogs) * 100) : 0}% of total`}
                  accent="emerald"
                />
                <MetricCard
                  icon={PencilLine}
                  label="Drafts"
                  value={analytics.draftCount}
                  hint="Blogs not live yet"
                  accent="amber"
                />
                <MetricCard
                  icon={Clock3}
                  label="Avg Read Time"
                  value={`${analytics.avgReadTime} min`}
                  hint={`${analytics.avgWords} avg words/blog`}
                  accent="blue"
                />
                <MetricCard
                  icon={ImageIcon}
                  label="With Cover Image"
                  value={analytics.withImage}
                  hint="Visual completeness"
                  accent="violet"
                />
                <MetricCard
                  icon={FileText}
                  label="With Content"
                  value={analytics.withContent}
                  hint="Non-empty article body"
                  accent="neutral"
                />
                <MetricCard
                  icon={Layers3}
                  label="Linked Products"
                  value={analytics.withProducts}
                  hint="Blogs having related products"
                  accent="rose"
                />
                <MetricCard
                  icon={CalendarDays}
                  label="Created This Month"
                  value={analytics.createdThisMonth}
                  hint={`${analytics.updatedThisWeek} updated this week`}
                  accent="blue"
                />
              </div>
            </div>

            {/* Distribution */}
            <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="p-5">
                <SectionTitle
                  icon={FolderKanban}
                  title="Top Categories"
                  subtitle="Most-used content buckets"
                />
                {analytics.topCategories.length ? (
                  <TinyBarList items={analytics.topCategories} />
                ) : (
                  <p className="text-sm text-neutral-500">No category data found.</p>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle
                  icon={Tag}
                  title="Top Tags"
                  subtitle="Most repeated blog tags"
                />
                {analytics.topTags.length ? (
                  <TinyBarList items={analytics.topTags} />
                ) : (
                  <p className="text-sm text-neutral-500">No tag data found.</p>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle
                  icon={Activity}
                  title="Publishing Trend"
                  subtitle="Recent creation trend by month"
                />
                {analytics.monthlyPublishing.length ? (
                  <TinyBarList items={analytics.monthlyPublishing} />
                ) : (
                  <p className="text-sm text-neutral-500">
                    Not enough timeline data available.
                  </p>
                )}
              </Card>
            </div>

            {/* Extra summary */}
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <SectionTitle
                  icon={Hash}
                  title="Content Summary"
                  subtitle="Useful averages and coverage indicators"
                />
                <StatRow label="Average tags per blog" value={analytics.avgTags} />
                <StatRow
                  label="Total words across filtered blogs"
                  value={analytics.totalWords.toLocaleString("en-IN")}
                />
                <StatRow
                  label="Blogs with author assigned"
                  value={analytics.withAuthor}
                />
                <StatRow
                  label="Blogs with related products"
                  value={analytics.withProducts}
                />
                <StatRow
                  label="Blogs with article content"
                  value={analytics.withContent}
                />
              </Card>

              <Card className="p-5">
                <SectionTitle
                  icon={Eye}
                  title="Actionable Observations"
                  subtitle="What these metrics suggest"
                />
                <div className="space-y-3 text-sm text-neutral-700">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    Publish ratio is{" "}
                    <span className="font-semibold text-neutral-900">
                      {analytics.totalBlogs
                        ? Math.round(
                            (analytics.publishedCount / analytics.totalBlogs) * 100
                          )
                        : 0}
                      %
                    </span>
                    . A lower ratio means editorial backlog is building up.
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    Blogs with cover image:{" "}
                    <span className="font-semibold text-neutral-900">
                      {analytics.withImage}/{analytics.totalBlogs}
                    </span>
                    . Missing visuals can weaken CTR and page presentation.
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    Average reading time is{" "}
                    <span className="font-semibold text-neutral-900">
                      {analytics.avgReadTime} min
                    </span>
                    . This is useful for planning short-form vs deep-dive content.
                  </div>
                </div>
              </Card>
            </div>

            {/* Single blog analytics */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="p-5">
                <SectionTitle
                  icon={BookOpen}
                  title="Single Blog Metrics"
                  subtitle="Detailed diagnostics for the selected blog"
                />

                {selectedBlog ? (
                  <>
                    <div className="mb-5 rounded-3xl border border-neutral-200 bg-gradient-to-br from-white via-neutral-50 to-neutral-100 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-neutral-950">
                            {s(selectedBlog.title) || "Untitled Blog"}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                              Slug: {s(selectedBlog.slug) || "—"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                selectedBlog.isPublished
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}
                            >
                              {selectedBlog.isPublished ? "Published" : "Draft"}
                            </span>
                            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                              {s(selectedBlog.category) || "Uncategorized"}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            Completeness Score
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-neutral-950">
                            {selectedStats?.completeness || 0}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        icon={FileText}
                        label="Word Count"
                        value={selectedStats?.wordCount || 0}
                        hint="From article content"
                        accent="neutral"
                      />
                      <MetricCard
                        icon={Clock3}
                        label="Reading Time"
                        value={`${selectedStats?.readTime || 0} min`}
                        hint="Estimated at 200 wpm"
                        accent="blue"
                      />
                      <MetricCard
                        icon={Tag}
                        label="Tags"
                        value={selectedStats?.tagCount || 0}
                        hint="Total assigned tags"
                        accent="violet"
                      />
                      <MetricCard
                        icon={Layers3}
                        label="Related Products"
                        value={selectedStats?.productCount || 0}
                        hint="Product references linked"
                        accent="rose"
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Card className="p-5">
                        <SectionTitle
                          icon={Activity}
                          title="Metadata Snapshot"
                          subtitle="Core blog fields"
                        />
                        <StatRow
                          label="Title length"
                          value={`${selectedStats?.titleLength || 0} chars`}
                        />
                        <StatRow
                          label="Excerpt length"
                          value={`${selectedStats?.excerptLength || 0} chars`}
                        />
                        <StatRow
                          label="Has image"
                          value={selectedStats?.hasImage ? "Yes" : "No"}
                        />
                        <StatRow
                          label="Has author"
                          value={selectedStats?.hasAuthor ? "Yes" : "No"}
                        />
                        <StatRow
                          label="Has category"
                          value={selectedStats?.hasCategory ? "Yes" : "No"}
                        />
                        <StatRow
                          label="Created at"
                          value={formatDateTime(selectedBlog?.createdAt)}
                        />
                        <StatRow
                          label="Updated at"
                          value={formatDateTime(selectedBlog?.updatedAt)}
                        />
                        <StatRow
                          label="Blog date"
                          value={formatDate(selectedBlog?.date)}
                        />
                      </Card>

                      <Card className="p-5">
                        <SectionTitle
                          icon={Sparkles}
                          title="SEO / Quality Checklist"
                          subtitle="Quick health checks"
                        />
                        <div className="grid grid-cols-1 gap-3">
                          <QualityItem
                            ok={selectedStats?.goodSlug}
                            label="Clean slug"
                            note="Lowercase, hyphen-based URL recommended"
                          />
                          <QualityItem
                            ok={selectedStats?.goodTitle}
                            label="Title length looks healthy"
                            note="Best when around 30–70 characters"
                          />
                          <QualityItem
                            ok={selectedStats?.goodExcerpt}
                            label="Excerpt length looks healthy"
                            note="Best when around 80–180 characters"
                          />
                          <QualityItem
                            ok={selectedStats?.goodContent}
                            label="Content depth is strong"
                            note="At least ~300 words recommended for richer blog pages"
                          />
                          <QualityItem
                            ok={selectedStats?.hasImage}
                            label="Cover image present"
                            note="Improves shareability and listing presentation"
                          />
                        </div>
                      </Card>
                    </div>

                    <div className="mt-5">
                      <Card className="p-5">
                        <SectionTitle
                          icon={Hash}
                          title="Tag & Content Preview"
                          subtitle="Useful quick-glance details"
                        />
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                          <div>
                            <p className="mb-3 text-sm font-medium text-neutral-700">
                              Tags
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(selectedBlog?.tags || []).length ? (
                                selectedBlog.tags.map((tag, idx) => (
                                  <span
                                    key={`${tag}-${idx}`}
                                    className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-neutral-500">
                                  No tags added
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="mb-3 text-sm font-medium text-neutral-700">
                              Excerpt Preview
                            </p>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
                              {s(selectedBlog?.excerpt) || "No excerpt added"}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500">
                    No blog found for the current filters.
                  </div>
                )}
              </Card>

              {/* Side list */}
              <Card className="p-5">
                <SectionTitle
                  icon={BookOpen}
                  title="Blog List Snapshot"
                  subtitle="Quick select and compare"
                />
                <div className="max-h-[980px] space-y-3 overflow-auto pr-1">
                  {(filteredBlogs || []).length ? (
                    filteredBlogs.map((blog) => {
                      const active = String(blog._id) === String(selectedId);
                      const wc = wordCount(blog?.content);

                      return (
                        <button
                          key={blog._id}
                          onClick={() => setSelectedId(blog._id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`line-clamp-2 text-sm font-semibold ${
                                  active ? "text-white" : "text-neutral-900"
                                }`}
                              >
                                {s(blog.title) || "Untitled Blog"}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    active
                                      ? "bg-white/10 text-white"
                                      : blog.isPublished
                                      ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                                      : "border border-amber-100 bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {blog.isPublished ? "Published" : "Draft"}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    active
                                      ? "bg-white/10 text-white"
                                      : "border border-neutral-200 bg-neutral-100 text-neutral-700"
                                  }`}
                                >
                                  {s(blog.category) || "Uncategorized"}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-medium ${
                                active
                                  ? "bg-white/10 text-white"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {wc} words
                            </div>
                          </div>

                          <div
                            className={`mt-3 grid grid-cols-3 gap-2 text-xs ${
                              active ? "text-neutral-200" : "text-neutral-500"
                            }`}
                          >
                            <div className="rounded-xl border border-current/10 px-2 py-2">
                              <p>Tags</p>
                              <p className="mt-1 font-semibold">
                                {(blog?.tags || []).length}
                              </p>
                            </div>
                            <div className="rounded-xl border border-current/10 px-2 py-2">
                              <p>Products</p>
                              <p className="mt-1 font-semibold">
                                {(blog?.products || []).length}
                              </p>
                            </div>
                            <div className="rounded-xl border border-current/10 px-2 py-2">
                              <p>Updated</p>
                              <p className="mt-1 font-semibold">
                                {formatDate(blog?.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                      No blogs match the selected filters.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}