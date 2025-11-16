// SIACTION.js (refactored with tweet batching every 10 posts)

import {
  createTables,
  filterNewLinks,
  saveArticle,
} from "../lib/Database/dbFunctions.js";
import { SiBlogReWriter } from "../agents/SiBlogReWriter.js";
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

  const si_categories = [
     { category_name: "soccer", category_type: "grid" },
     { category_name: "nba", category_type: "grid" },
   
   
     { category_name: "nfl", category_type: "grid" },
  ];

  const selecteddate = getTodayFormatted();
  console.log("📅 Selected date:", selecteddate);

  let todaysArticles = 0;
  let tweetBatch = []; // Store tweet texts
  let tweetCount = 0; // Count tweets made

  for (const si_category of si_categories) {
    try {
      console.log(
        `\n📰 Fetching links for category: ${si_category.category_name}...`
      );

      let links = await FETCH_ARTICLE_LINKS(selecteddate, si_category);
      if (!links.success) continue;
      //console.log(links);
      console.log(
        `✅ ${links.articles?.length} links fetched for ${si_category.category_name}`
      );
      todaysArticles += links.articles?.length;

      const filtered = await filterNewLinks(links?.articles, si_category);
      if (!filtered?.success || !Array.isArray(filtered.data)) {
        console.warn(
          `⚠️ Could not filter links for ${si_category.category_name}`
        );
        continue;
      }

      console.log(
        `📰 Found ${filtered.data.length} new articles for ${si_category.category_name}`
      );

      //console.log(filtered)
      
      for (let current_link of filtered.data) {
        try {
         // current_link = JSON.parse(current_link);
 
          const html = await FETCH_NEWS_ARTICLE_DETAILS(current_link.link);
          if (!html.success) {
            console.warn(`⚠️ Failed to extract HTML for ${current_link.link}`);
          }

          const wordpressdata = await SiBlogReWriter(
            html.data.articleHtml,
            si_category
          );
          if (!wordpressdata?.answer) continue;

          const parsedresult = safeParseYAML(wordpressdata.answer);
          if (!parsedresult) continue;

          const wordpressresult = await SiWordpressPublisher(parsedresult);
          if (!wordpressresult?.data) continue;

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

          // Prepare tweet text
          let hashtags = parsedresult.tags.map((tag) => `#${tag}`).join(" ");

          let twittertext = `${parsedresult.summary}...

${article.wp_permalink}

${hashtags}`;

          // Increment tweet counter
          tweetCount++;

          // Only tweet on every 10th article
          if (tweetCount === 10) {
            console.log("🐦 Posting single tweet for 10th article...");

            await TwitterAction(
              parsedresult.title,
              twittertext,
              parsedresult.featured_image
            );

            // Reset counter
            tweetCount = 0;
          }

          // Continue to next article
          // Skip tweeting for others
          if (tweetBatch.length === 10) {
            console.log("🐦 Posting tweet batch of 10...");
            tweetCount++;

            let combinedPost = tweetBatch
              .map((t, index) => `${index + 1}. ${t.title}`)
              .join("\n");

            combinedPost += `\n\nRead all posts on our site.`;

            // Tweet once for the batch
            await TwitterAction(
              `Batch Update #${tweetCount}`,
              combinedPost,
              null
            );

            // Reset batch
            tweetBatch = [];
          }
        } catch (innerErr) {
          console.error(
            `❌ Error processing article ${current_link.link}:`,
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

  // Post remaining tweets if fewer than 10 exist
  if (tweetBatch.length > 0) {
    tweetCount++;
    console.log(`🐦 Posting final batch of ${tweetBatch.length} tweets...`);

    let combinedPost = tweetBatch
      .map((t, index) => `${index + 1}. ${t.title}`)
      .join("\n");

    combinedPost += `\n\nRead full posts on our website.`;

    await TwitterAction(`Batch Update #${tweetCount}`, combinedPost, null);
  }

  console.log(
    `\n🎯 All categories processed. Total articles: ${todaysArticles}. Total tweet batches: ${tweetCount}`
  );
}
