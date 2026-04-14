module.exports = function (eleventyConfig) {
  // Copy CNAME to output root for GitHub Pages
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });

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
