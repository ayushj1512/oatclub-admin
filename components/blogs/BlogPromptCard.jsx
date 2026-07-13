"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const BLOG_JSON_SCHEMA = `{
  "title": "",
  "slug": "",
  "excerpt": "",
  "category": "",
  "tags": [],
  "content": "",
  "isPublished": true
}`;

export default function BlogPromptCard({ imageUrl = "" }) {
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => `

You are a Senior Fashion Editor, SEO Specialist, Luxury Copywriter and Visual Stylist.

Your job is to analyse the uploaded fashion image and generate ONE extremely high quality fashion blog.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIMARY TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Study the uploaded image carefully.

Understand:

• Outfit
• Clothing Category
• Style
• Fit
• Color Palette
• Fabric (only if visually identifiable)
• Fashion Trend
• Occasion
• Target Audience
• Accessories
• Overall Mood
• Aesthetic
• Season
• Fashion Inspiration

Do NOT invent anything which cannot be inferred visually.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write like Vogue, Zara Editorial, H&M Stories,
Pinterest Fashion Guides and High-end Fashion Magazines.

Tone should be

• Premium
• Elegant
• Modern
• Minimal
• Helpful
• Human
• Natural

Never sound AI generated.

Avoid:

❌ "In today's fast moving fashion world"

❌ repetitive words

❌ robotic writing

❌ keyword stuffing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEO REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate content optimized for Google.

Include naturally:

• Primary Keywords

• Secondary Keywords

• Long-tail Keywords

without keyword stuffing.

Create:

SEO Friendly

Title

Slug

Excerpt

Headings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOG STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The article should contain

Introduction

Image Analysis

Outfit Breakdown

Why this look works

Fashion Tips

Styling Guide

Color Pairing Suggestions

Occasion Suggestions

Season Recommendations

Footwear Suggestions

Accessories Suggestions

Body Type Recommendations

Do's

Don'ts

Care Tips (only if possible)

Final Thoughts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blog should contain

1000-1800 words.

Use

# Heading

## Heading

### Heading

Bullet Lists

Numbered Lists

Bold Text

Markdown formatting.

Paragraphs should remain short.

Easy to read.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never mention

AI

ChatGPT

Image Generation

Machine Learning

Vision Model

Never invent

Price

Brand

Discount

SKU

Product Code

Fabric composition unless clearly visible.

If unsure,

omit the information.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON.

No markdown.

No explanation.

No code block.

No extra text.

Return EXACTLY this schema.

${BLOG_JSON_SCHEMA}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${imageUrl}

`,
    [imageUrl]
  );

  const copyPrompt = async () => {
    if (!imageUrl) {
      alert("Please select an image first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Clipboard access failed.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-black text-white">
              2
            </span>
            AI Prompt
          </div>

          <h2 className="mt-3 text-2xl font-semibold">
            Generate Blog JSON
          </h2>

          <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>1. Open ChatGPT / JSON Playground</p>
            <p>2. Import the selected image</p>
            <p>3. Click Copy Prompt below</p>
            <p>4. Paste the prompt</p>
            <p>5. Generate JSON</p>
            <p>6. Paste JSON into Step 3</p>
          </div>
        </div>

        <Sparkles size={24} className="text-gray-400" />
      </div>

      <button
        onClick={copyPrompt}
        disabled={!imageUrl}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-white font-medium hover:bg-gray-900 disabled:opacity-40"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? "Prompt Copied" : "Copy Prompt"}
      </button>
    </div>
  );
}