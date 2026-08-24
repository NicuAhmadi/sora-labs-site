// Sora Labs — production build.
//   site-live/  →  _site/   (deployed to sora-labs.net by .github/workflows/deploy.yml)
//
// archive-consulting-site/ holds the previous consulting-positioned site. It is
// deliberately outside the input directory, so it is kept in the repo for
// reference but never built or published.
module.exports = function (eleventyConfig) {
  // GitHub Pages custom domain
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });

  // Stylesheets. tokens.css is the older dark palette that the carried-over
  // pages still reference; tokens-light.css loads after it site-wide and
  // overrides it. site.css holds every component for the current pages.
  eleventyConfig.addPassthroughCopy({ "site-live/css/tokens.css": "css/tokens.css" });
  eleventyConfig.addPassthroughCopy({ "site-live/css/tokens-light.css": "css/tokens-light.css" });
  eleventyConfig.addPassthroughCopy({ "site-live/css/site.css": "css/site.css" });

  // Shared page behaviour: scroll sequences, the how-it-works animation, anchors
  eleventyConfig.addPassthroughCopy({ "site-live/js/site.js": "js/site.js" });

  // CTEIG calculator data file → served alongside the page at /tools/cteig/
  eleventyConfig.addPassthroughCopy({
    "site-live/tools/cteig/districts.json": "tools/cteig/districts.json",
  });

  // SEO
  eleventyConfig.addPassthroughCopy({ "site-live/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "site-live/llms.txt": "llms.txt" });

  return {
    dir: {
      input: "site-live",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
