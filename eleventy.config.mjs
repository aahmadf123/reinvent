import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Stand-ins for the branding guide's licensed faces — see docs/brand.md.
  eleventyConfig.addPassthroughCopy({
    "node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-500-normal.woff2": "assets/fonts/saira-condensed-500.woff2",
    "node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-600-normal.woff2": "assets/fonts/saira-condensed-600.woff2",
    "node_modules/@fontsource/saira-condensed/files/saira-condensed-latin-700-normal.woff2": "assets/fonts/saira-condensed-700.woff2",
    "node_modules/@fontsource/montserrat/files/montserrat-latin-400-normal.woff2": "assets/fonts/montserrat-400.woff2",
    "node_modules/@fontsource/montserrat/files/montserrat-latin-500-normal.woff2": "assets/fonts/montserrat-500.woff2",
    "node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff2": "assets/fonts/montserrat-600.woff2",
    "node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2": "assets/fonts/montserrat-700.woff2"
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
