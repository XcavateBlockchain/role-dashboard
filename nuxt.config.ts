import tailwindcss from '@tailwindcss/vite'

// Admin dashboard for the xcavate-whitelist Solana program (devnet).
// Reads go through the realXmarket indexer GraphQL API (proxied at /api/graphql);
// writes are signed in the browser via Wallet Standard and sent through the
// Alchemy RPC proxy at /api/rpc (keeps the API key server-side).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  // Wallet-gated admin dApp: no SEO/first-paint value in SSR, and the
  // Solana/web3.js dependency chain breaks Node-native ESM. SPA on the client;
  // Nitro only serves the /api/rpc and /api/graphql proxies.
  ssr: false,

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Server-only — override at container start with NUXT_ALCHEMY_API_KEY etc.
    alchemyApiKey: '',
    alchemyRpcUrl: 'https://solana-devnet.g.alchemy.com/v2/',
    indexerUrl: 'http://localhost:3010/graphql',
    public: {
      cluster: 'devnet',
      programId: '7TrzjKpdrEhnfhxuw8tWdH1sjxadazscsG5HXCDPLmaY',
      appName: 'realXmarket · Role Dashboard',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'realXmarket Role Dashboard',
      meta: [
        { name: 'color-scheme', content: 'light dark' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Admin dashboard for xcavate-whitelist role management on Solana devnet.',
        },
      ],
      script: [
        {
          // Set the pinned/system theme before first paint (avoids FOUC).
          tagPriority: 'critical',
          innerHTML:
            '!function(){try{var p=localStorage.getItem("theme");var d=p?p==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.add(d?"dark":"light")}catch(e){}}()',
        },
      ],
    },
  },
})
