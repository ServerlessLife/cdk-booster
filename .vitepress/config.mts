import { defineConfig } from 'vitepress';
import markdownItYouTubeEmbed from './markdown-it-youtube-embed.js';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'CDK Booster',
  description:
    'Speeds up AWS CDK bundling of TypeScript/JavaScript Lambda handlers',
  /* prettier-ignore */
  head: [
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { 'http-equiv': 'Content-Type', content: 'text/html; charset=utf-8' }],
    ['meta', { name: 'language', content: 'English' }],
    ['meta', { name: 'revisit-after', content: '1 days' }],
    ['meta', { name: 'author', content: 'Marko (ServerlessLife)' }],
    ['meta', { name: 'keywords', content: 'aws, lambda, bundling, serverless, aws-lambda, javascript, typescript, dev-tools, aws-cdk, cdk-booster, lambda-bundling, esbuild' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon_light.png' , media:"(prefers-color-scheme: light)" }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32_light.png', media:"(prefers-color-scheme: light)" }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16_light.png', media:"(prefers-color-scheme: light)" }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'msapplication-TileColor', content: '#DD1239' }],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon_dark.png' , media:"(prefers-color-scheme: dark)" }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32_dark.png', media:"(prefers-color-scheme: dark)" }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16_dark.png', media:"(prefers-color-scheme: dark)" }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'CDK Booster | Speeds up AWS CDK bundling of TypeScript/JavaScript Lambda handlers' }],
    ['meta', { property: 'og:site_name', content: 'CDK Booster' }],
    ['meta', { property: 'og:image', content: 'https://cdkbooster.com/lambda_live_debugger.png' }],
    ['meta', { property: 'og:url', content: 'https://cdkbooster.com/' }],

    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:site', content: '@serverlessl' }],


  ],
  // sitemap: {
  //   hostname: 'https://www.cdkbooster.com',
  // },
  themeConfig: {
    search: {
      provider: 'local',
    },
    siteTitle: 'CDK Booster',
    logo: {
      light: '/logo_light.svg',
      dark: '/logo_dark.svg',
    },
    sidebar: [
      {
        text: 'Introduction',
        collapsed: false,
        items: [
          { text: 'Key Benefits', link: '#key-benefits' },
          { text: 'How It Works', link: '#how-it-works' },
          { text: 'Requirements', link: '#requirements' },
        ],
      },
      {
        text: 'Getting Started',
        collapsed: false,
        items: [
          { text: 'Installation', link: '#installation' },
          { text: 'Setup', link: '#setup' },
          { text: 'Usage', link: '#usage' },
        ],
      },
      { text: 'Authors', link: '#authors' },
      { text: 'Contributors', link: '#contributors' },
      { text: 'Disclaimer', link: '#disclaimer' },
      {
        text: `
          <span style="white-space: nowrap; display: flex; align-items: center; gap: 6px;">
            <img alt="Serverless Life logo" style="height: 27px" src="https://www.serverlesslife.com/img/logo_light.svg" class="light-mode">
            <img alt="Serverless Life logo" style="height: 27px" src="https://www.serverlesslife.com/img/logo_dark.svg" class="dark-mode">
            www.serverlesslife.com
          </span>
        `,
        link: 'https://www.serverlesslife.com',
      },
    ],

    socialLinks: [
      {
        icon: {
          svg: `
            <img alt="Serverless Life logo" style="height: 26px" src="https://www.serverlesslife.com/img/logo_light.svg" class="light-mode">
            <img alt="Serverless Life logo" style="height: 26px" src="https://www.serverlesslife.com/img/logo_dark.svg" class="dark-mode">
          `,
        },

        link: 'https://www.serverlesslife.com',
        ariaLabel: 'Serverless Life',
      },
      {
        icon: 'github',
        link: 'https://github.com/ServerlessLife/cdk-booster',
      },
    ],
  },
  markdown: {
    config: (md) => {
      md.use(markdownItYouTubeEmbed);
    },
  },
});
