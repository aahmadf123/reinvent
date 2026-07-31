import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2": "assets/fonts/barlow-condensed-600.woff2",
    "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2": "assets/fonts/barlow-condensed-700.woff2",
    "node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2": "assets/fonts/barlow-400.woff2",
    "node_modules/@fontsource/barlow/files/barlow-latin-500-normal.woff2": "assets/fonts/barlow-500.woff2",
    "node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff2": "assets/fonts/barlow-600.woff2",
    "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2": "assets/fonts/plex-mono-500.woff2",
    "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2": "assets/fonts/plex-mono-600.woff2"
  });

  eleventyConfig.addWatchTarget("src/assets/");

  return {
    dir: {
      input: "src/pages",
      includes: "../_includes",
      data: "../_data",
      output: "_site"
    },
    pathPrefix: process.env.PATH_PREFIX || "/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
