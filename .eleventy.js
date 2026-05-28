module.exports = function (eleventyConfig) {
  // Copy CNAME to output root for GitHub Pages
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });

  // CTEIG calculator data file → served alongside the page at /tools/cteig/
  eleventyConfig.addPassthroughCopy({
    "src/tools/cteig/districts.json": "tools/cteig/districts.json",
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
