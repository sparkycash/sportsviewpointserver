// SIACTION.js

import {
  createTables,
  filterNewLinks,
  saveArticle,
} from "../lib/Database/dbFunctions.js";
import { SiBlogReWriter } from "../agents/SIBLOGREWRITER.js";
import {
  FETCH_ARTICLE_LINKS,
  FETCH_NEWS_ARTICLE_DETAILS,
} from "../scrapers/SiScrapper.js";
import { safeParseYAML } from "../lib/globalfunctions.js";
import { SiWordpressPublisher } from "../publishers/Wordpress/SiWordpressPublisher.js";
import { TwitterAction } from "./TwitterAction.js";

// Utility: Get today's formatted date
function getTodayFormatted() {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Utility: Async delay function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function SIACTION() {
  console.log("🔄 Starting background ping loop...");

  // Optionally ensure tables exist
  // await createTables();

  const si_categories = [
    { category_name: "soccer", category_type: "grid" },
    // { category_name: "nfl", category_type: "grid" },
    // { category_name: "nba", category_type: "grid" },
    // { category_name: "FANTASY", category_type: "grid" },
    // { category_name: "GOLF", category_type: "grid" },
    // { category_name: "boxing", category_type: "grid" },
  ];

  const selecteddate = getTodayFormatted();
  console.log("📅 Selected date:", selecteddate);

  let todysarticles = 0;

  for (const si_category of si_categories) {
    try {
      console.log(
        `\n📰 Fetching links for category: ${si_category.category_name}...`
      );

      let links = await FETCH_ARTICLE_LINKS(selecteddate, si_category);

      if (!links.success) {
        continue;
      }
      console.log(
        `✅ ${links.articles?.length} links fetched for ${si_category.category_name}`
      );
      todysarticles += links.articles?.length;

      links = links?.articles;

      const filtered = await filterNewLinks(links);
      if (!filtered?.success || !Array.isArray(filtered.data)) {
        console.warn(
          `⚠️ Could not filter links for ${si_category.category_name}`
        );
        continue;
      }

      console.log(
        `📰 Found ${filtered.data.length} new articles for ${si_category.category_name}`
      );

      for (let current_link of filtered.data) {
        try {
          //console.log(`➡️ Processing: ${current_link}`);

          current_link = JSON.parse(current_link);

          const html = await FETCH_NEWS_ARTICLE_DETAILS(current_link.link);
          if (!html.success) {
            console.warn(`⚠️ Failed to extract HTML for ${current_link.link}`);
            // continue;
          }

          //      data: {
          //   title,
          //   originalLink:url,
          //   image,
          //   imageAlt,
          //   datePosted,
          //   articleHtml: articleSection,
          // }

          const wordpressdata = await SiBlogReWriter(
            html.data.articleHtml,
            si_category
          );
          if (!wordpressdata?.answer) {
            console.warn(`⚠️ No rewrite data returned for ${current_link}`);
            continue;
          }

          const parsedresult = safeParseYAML(wordpressdata.answer);
          if (!parsedresult) {
            console.error(`❌ Failed to parse YAML for ${current_link}`);
            continue;
          }

          const wordpressresult = await SiWordpressPublisher(parsedresult);
          if (!wordpressresult?.data) {
            console.error(
              `❌ Failed to upload post to WordPress for ${current_link}`
            );
            continue;
          }

          const article = {
            source: "SI",
            original_link: current_link,
            original_title: parsedresult.original_title || "",
            original_date: new Date().toISOString(),
            original_featured_image: parsedresult.featured_image || "",
            original_blog_content: html,
            wp_content: parsedresult.content || "",
            new_title: parsedresult.title || "",
            keywords: JSON.stringify(parsedresult.keywords || []),
            tags: JSON.stringify(parsedresult.tags || []),
            summary: JSON.stringify(parsedresult.summary || ""),
            category: si_category.category_name,
            wp_permalink: wordpressresult.data.link || "",
            status: wordpressresult.data.status || "unknown",
            description: wordpressresult.data.status || "No description",
          };

          await saveArticle(article);
          console.log(
            `✅ NEW ARTICLE SAVED at ${new Date().toLocaleTimeString()}`
          );

          let hashtags = parsedresult.tags.map((tag) => "#" + tag);

          let twittertext =
            parsedresult.summary +
            "...\n\n" +
            article.wp_permalink +
            "\n\n" +
            hashtags;
          await TwitterAction(
            parsedresult.title,
            twittertext,
            parsedresult.featured_image
          );
        } catch (innerErr) {
          console.error(
            `❌ Error processing article ${current_link}:`,
            innerErr.message
          );
        }
      }
    } catch (err) {
      console.error(
        `❌ Error processing category ${si_category.category_name}:`,
        err.message
      );
    }
  }

  console.log(
    `\n🎯 All categories processed successfully. Total articles: ${todysarticles}`
  );
}
