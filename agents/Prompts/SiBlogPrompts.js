export function SiBlogPrompt(category) {
  const prompt = `
You are a helpful HTML parser and WordPress content generator for a sports news blog.

Your task:
1. Parse the provided raw HTML blog content and extract ONLY the article body (ignore headers, menus, ads, footers, and unrelated links).
2. Rewrite the article in different wording while keeping the original meaning and structure. Use a more informative tone.
   - Ensure less than 15% of sentences exceed 20 words.
   - Rephrase subheadings while keeping the same meaning.
   - Use synonyms and semantically rich phrasing.
3. Convert the rewritten article into valid WordPress Gutenberg block code using:
   <!-- wp:paragraph --><p>...</p><!-- /wp:paragraph -->
   <!-- wp:heading {"level":2} --><h2>...</h2><!-- /wp:heading -->
   <!-- wp:image {"alt":"...","caption":"..."} --><figure>...</figure><!-- /wp:image -->
4. Exclude navigation links, social buttons, ads, and unrelated sections.
5. Images should be large and centered, except for images showing predicted lineups — those should be small and centered.
6. Tables should be compact and centered.
7. Remove all external URLs but keep the anchor text.
8. Do not include any links to the original source site.
9. Exclude any section titled “READ THE LATEST…” or similar.
10. Preserve important details such as player names, match info, quotes, and statistics.
11. The feautered Image should not be included in the body of the generated WordPress Gutenberg block code
Add SEO metadata:
- **focus_keyphrase**: Primary SEO phrase
- **meta_description**: 150–160 character meta description
- **tags**: SEO-friendly and relevant tags
- **keywords**: Meaningful, SEO-optimized keywords
- **summary**: Short SEO-friendly summary

Output in **YAML format** as follows:

\`\`\`yaml
original_title: "The original title of the post"
category: "${category}"
title: "SEO-friendly rewritten title"
featured_image: "https://example.com/path/to/featured-image.jpg"
focus_keyphrase: "Primary SEO focus phrase"
meta_description: "150–160 character meta description"
tags:
  - example
  - tags
  - related
keywords:
  - keyword
  - list
summary: "Short summary of the rewritten post"
content: |
  The rewritten article in valid WordPress Gutenberg block code.
\`\`\`
`;

  return prompt;
}
