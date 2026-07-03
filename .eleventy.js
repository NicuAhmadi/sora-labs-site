module.exports = function (eleventyConfig) {
  // Copy CNAME to output root for GitHub Pages
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });

  // CTEIG calculator data file → served alongside the page at /tools/cteig/
  eleventyConfig.addPassthroughCopy({
    "src/tools/cteig/districts.json": "tools/cteig/districts.json",
  });

  // Shared design tokens → /css/tokens.css (linked site-wide via base.njk)
  eleventyConfig.addPassthroughCopy({
    "src/css/tokens.css": "css/tokens.css",
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
