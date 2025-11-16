import axios from "axios";
import * as cheerio from "cheerio";

function filterArticles(data, datePosted) {
  // Titles you want to filter out (the "navigation" titles)
  console.log("filtering articles" + datePosted);
  const excludedTitles = new Set([
    "Home",
    "Transfers",
    "Premier League",
    "La Liga",
    "MLS",
    "Champions League",
    "Europa League",
    "Club World Cup",
    "Arsenal",
    "Chelsea",
    "Liverpool",
    "Manchester City",
    "Manchester United",
    "Barcelona",
    "Real Madrid",
    "Bayern Munich",
    "Paris Saint-Germain",
    "Inter Miami",
    "LA Galaxy",
    "More Teams",
    "Ballon d’Or",
    "Women's",
    "FPL",
    "EA FC",
    "Soccer 101",
    "Futures",
  ]);

  return data.filter(
    (item) => !excludedTitles.has(item.title) && item.datePosted === datePosted
  );
}




export async function FETCH_ARTICLE_LINKS(selecteddate, category) {
  console.log(selecteddate);
  console.log("Getting Links for " + category.category_name);
  try {
    const allArticles = [];
    const numberOfPages = 10;
    let searchdate = selecteddate;

    for (let page = 1; page <= numberOfPages; page++) {
      let url = `https://www.si.com/${category.category_name}/archive?page=${page}`;
      console.log(url);
      const { data: html } = await axios.get(url);
      
      const $ = cheerio.load(html);

      // Method 1: Look for article links in main content areas
      // Target specific containers that likely contain articles
      const contentSelectors = [
        'main a[href*="/' + category.category_name + '/"]',
        '[class*="content"] a[href*="/' + category.category_name + '/"]',
        '[class*="article"] a[href*="/' + category.category_name + '/"]',
        '[class*="story"] a[href*="/' + category.category_name + '/"]',
        '[class*="card"] a[href*="/' + category.category_name + '/"]',
        '[class*="feed"] a[href*="/' + category.category_name + '/"]',
        '[class*="post"] a[href*="/' + category.category_name + '/"]',
        'section a[href*="/' + category.category_name + '/"]',
        '.line-content a[href*="/' + category.category_name + '/"]' // Based on the HTML structure you provided
      ];

      let articleLinks = [];

      // Try each selector to find the main content area
      for (const selector of contentSelectors) {
        const links = $(selector)
          .filter((_, el) => {
            const href = $(el).attr("href");
            const $el = $(el);
            
            // More specific filtering for article links
            return (
              href &&
              href.includes(`/${category.category_name}/`) &&
              !href.includes(`/${category.category_name}/archive`) &&
              !href.includes(`/${category.category_name}/?`) &&
              // Article URLs typically have a date pattern or specific structure
              (href.match(/\/\d{4}\/\d{2}\/\d{2}\//) || 
               href.split("/").filter(Boolean).length >= 4) && // At least 4 path segments
              // Exclude obvious navigation and non-article links
              !$el.closest('nav, header, [class*="nav"], [class*="menu"]').length &&
              // Ensure the link has meaningful text content
              $el.text().trim().length > 10
            );
          })
          .map((_, el) => {
            const $el = $(el);
            const href = $el.attr("href");
            const fullUrl = href.startsWith("http")
              ? href
              : `https://www.si.com${href}`;

            // Get title from the link text or nearby heading
            let title = $el.text().trim();
            
            // If link text is too short, try to find a nearby heading
            if (title.length < 15) {
              title = $el.closest('article, [class*="card"], [class*="story"]')
                .find('h1, h2, h3, h4, [class*="title"], [class*="headline"]')
                .first()
                .text()
                .trim();
            }

            // Clean up the title
            title = title.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");

            return {
              title: title || "No title found",
              link: fullUrl,
              datePosted: new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
            };
          })
          .get();

        if (links.length > 0) {
          articleLinks = links;
          break; // Use the first selector that finds articles
        }
      }

      // Method 2: Look for specific article patterns in the HTML
      if (articleLinks.length === 0) {
        // Find all links and apply more sophisticated filtering
        $('a[href*="/' + category.category_name + '/"]').each((_, el) => {
          const $el = $(el);
          const href = $el.attr("href");
          
          if (!href || 
              href.includes(`/${category.category_name}/archive`) ||
              href.includes(`/${category.category_name}/?`)) {
            return;
          }

          // Check if this looks like an article link
          const pathSegments = href.split("/").filter(Boolean);
          if (pathSegments.length < 3) return; // Too short for article

          // Check if parent container suggests it's an article
          const $container = $el.closest('article, [class*="card"], [class*="story"], [class*="content"]');
          if (!$container.length) return;

          // Check if it has sufficient text content
          const linkText = $el.text().trim();
          if (linkText.length < 10) return;

          const fullUrl = href.startsWith("http") ? href : `https://www.si.com${href}`;

          let title = linkText;
          // Try to find a better title in the container
          const containerTitle = $container.find('h1, h2, h3, h4, [class*="title"]').first().text().trim();
          if (containerTitle && containerTitle.length > title.length) {
            title = containerTitle;
          }

          articleLinks.push({
            title: title,
            link: fullUrl,
            datePosted: new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          });
        });
      }

      // Remove duplicates based on URL
      const uniqueLinks = articleLinks.filter((link, index, self) =>
        index === self.findIndex((l) => l.link === link.link)
      );

      allArticles.push(...uniqueLinks);

      // If no links found on this page, break the loop
      if (uniqueLinks.length === 0) {
        console.log(`No articles found on page ${page}, stopping pagination`);
        break;
      }
    }

    console.log(`Found ${allArticles.length} articles for ${category.category_name.toUpperCase()}`);
    
    // Since we're now targeting only article content, we can skip the filterArticles function
    // But still filter by date if needed
    const filteredArticles = allArticles.filter(item => item.datePosted === searchdate);
    console.log(`Found ${filteredArticles.length} filtered articles`);
    
    return { success: true, articles: filteredArticles };
  } catch (error) {
    console.log("Error scraping SI:", error.message);
    return { success: false, error: error.message };
  }
}




export async function FETCH_ARTICLE_LINKS3(selecteddate, category) {
  console.log(selecteddate);
  console.log("Getting Links for "+ category.category_name)
  try {
    const allArticles = [];
    const numberOfPages = 10; // Start with 1 page for testing
    let searchdate = selecteddate;

    for (let page = 1; page <= numberOfPages; page++) {
        let url =  `https://www.si.com/${category.category_name}/archive?page=${page}`
        console.log(url)
      const { data: html } = await axios.get(url)
      
      
      const $ = cheerio.load(html);

      // Method 1: Look for article links in the main content
      const articleLinks = $(`a[href*="/${category.category_name}/"]`)
        .filter((_, el) => {
          const href = $(el).attr("href");
          // Filter out navigation links and keep only article links
          return (
            href &&
            href.includes(`/${category.category_name}/`) &&
            !href.includes(`/${category.category_name}/archive`) &&
            !href.includes(`/${category.category_name}/?`) &&
            href.split("/").length > 4
          ); // Article URLs have more path segments
        })
        .map((_, el) => {
          const $el = $(el);
          const href = $el.attr("href");
          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.si.com${href}`;

          // Try to find title from various possible locations
          let title =
            $el.attr("title") ||
            $el.find("h1, h2, h3, h4").first().text() ||
            $el.text();

          // Clean up the title
          title = title.trim().replace(/\s+/g, " ");

          return {
            title: title || "No title found",
            link: fullUrl,
            datePosted: new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          };
        })
        .get();

      // Method 2: Alternative approach - look for specific CSS classes or patterns
      const alternativeLinks = $(
        '[class*="card"], [class*="article"], [class*="story"]'
      )
        .find(`a[href*="/${category.category_name}/"]`)
        .map((_, el) => {
          const $el = $(el);
          const href = $el.attr("href");
          if (!href || href.includes(`/${category.category_name}/archive`)) return null;

          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.si.com${href}`;
          const title =
            $el.text().trim() || $el.attr("title") || "No title found";

          return {
            title: title,
            link: fullUrl,
            datePosted: new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          };
        })
        .get()
        .filter((link) => link !== null);

      // Combine results from both methods and remove duplicates
      const combinedLinks = [...articleLinks, ...alternativeLinks];
      const uniqueLinks = combinedLinks.filter(
        (link, index, self) =>
          index === self.findIndex((l) => l.link === link.link)
      );

      allArticles.push(...uniqueLinks);

      // If no links found on this page, break the loop
      if (uniqueLinks.length === 0) {
        console.log(`No articles found on page ${page}, stopping pagination`);
        break;
      }
    }

    console.log(`Found ${allArticles.length} articles for ${category.category_name.toUpperCase()}`);
    let filteredArticles = filterArticles(allArticles, searchdate);
    console.log(`Found ${filteredArticles.length} filtered articles`);
    return { success: true, articles: filteredArticles };
  } catch (error) {
    console.log("Error scraping SI:", error.message);
    return { success: false, error: error.message };
  }
}


export async function FETCH_ARTICLE_LINKS2(selecteddate, category) {
  console.log(selecteddate);
  console.log("Getting Links for "+ category.category_name)
  try {
    const allArticles = [];
    const numberOfPages = 10; // Start with 1 page for testing
    let searchdate = selecteddate;

    for (let page = 1; page <= numberOfPages; page++) {
        let url =  `https://www.si.com/${category.category_name}/archive?page=${page}`
        console.log(url)
      const { data: html } = await axios.get(url)
      
      
      const $ = cheerio.load(html);

      // Method 1: Look for article links in the main content
      const articleLinks = $('a[href*="/soccer/"]')
        .filter((_, el) => {
          const href = $(el).attr("href");
          // Filter out navigation links and keep only article links
          return (
            href &&
            href.includes(`/${category.category_name}/`) &&
            !href.includes(`/${category.category_name}/archive`) &&
            !href.includes(`/${category.category_name}/?`) &&
            href.split("/").length > 4
          ); // Article URLs have more path segments
        })
        .map((_, el) => {
          const $el = $(el);
          const href = $el.attr("href");
          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.si.com${href}`;

          // Try to find title from various possible locations
          let title =
            $el.attr("title") ||
            $el.find("h1, h2, h3, h4").first().text() ||
            $el.text();

          // Clean up the title
          title = title.trim().replace(/\s+/g, " ");

          return {
            title: title || "No title found",
            link: fullUrl,
            datePosted: new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          };
        })
        .get();

      // Method 2: Alternative approach - look for specific CSS classes or patterns
      const alternativeLinks = $(
        '[class*="card"], [class*="article"], [class*="story"]'
      )
        .find('a[href*="/soccer/"]')
        .map((_, el) => {
          const $el = $(el);
          const href = $el.attr("href");
          if (!href || href.includes("/soccer/archive")) return null;

          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.si.com${href}`;
          const title =
            $el.text().trim() || $el.attr("title") || "No title found";

          return {
            title: title,
            link: fullUrl,
            datePosted: new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          };
        })
        .get()
        .filter((link) => link !== null);

      // Combine results from both methods and remove duplicates
      const combinedLinks = [...articleLinks, ...alternativeLinks];
      const uniqueLinks = combinedLinks.filter(
        (link, index, self) =>
          index === self.findIndex((l) => l.link === link.link)
      );

      allArticles.push(...uniqueLinks);

      // If no links found on this page, break the loop
      if (uniqueLinks.length === 0) {
        console.log(`No articles found on page ${page}, stopping pagination`);
        break;
      }
    }

    console.log(`Found ${allArticles.length} articles for ${category.category_name.toUpperCase()}`);
    let filteredArticles = filterArticles(allArticles, searchdate);
    console.log(`Found ${filteredArticles.length} filtered articles`);
    return { success: true, articles: filteredArticles };
  } catch (error) {
    console.log("Error scraping SI:", error.message);
    return { success: false, error: error.message };
  }
}

export async function FETCH_NEWS_ARTICLE_DETAILS(url) {
    console.log (url)
  try {
    if (!url || !url.startsWith('https://www.si.com/')) {
      return { success: false, error: 'Invalid or missing URL' };
    }

    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') || $('title').text();

    const image = $('meta[property="og:image"]').attr('content') || null;

    const imageAlt =
      $('meta[property="og:description"]').attr('content') ||
      $('img[alt]').first().attr('alt') ||
      '';

    const rawDate = $('meta[property="article:published_time"]').attr('content');

    const datePosted = rawDate
      ? new Date(rawDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    const articleSection = $('body').html();

    return {
      success: true,
      data: {
        title,
        originalLink:url,
        image,
        imageAlt,
        datePosted,
        articleHtml: articleSection,
      },
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

