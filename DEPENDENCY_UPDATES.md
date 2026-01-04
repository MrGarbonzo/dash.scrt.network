# Dependency Updates Needed

## Priority 1: Security Vulnerabilities

Run `npm audit` to address 22 vulnerabilities (4 low, 8 moderate, 7 high, 3 critical).

## Priority 2: Deprecated Packages

To address deprecation warnings from nested packages:

- Update `@web3modal/*` to `@reown/appkit` (breaking change, requires code updates)
- Update `@walletconnect/sign-client` to latest
- Update `rimraf` to v4+ (used by dependencies)
- Update `glob` to v9+ (used by dependencies)

## Priority 3: Build Optimizations

Large bundle sizes detected:

- `production-*.js` (5.3 MB / 1.5 MB gzipped)
- `index-*.js` (24.5 MB / 5.2 MB gzipped)

Consider:

- Using dynamic `import()` to code-split the application
- Configure `build.rollupOptions.output.manualChunks` in vite.config.ts
- Lazy load heavy dependencies like `secretjs`, `@swing.xyz/sdk`, `metamask-sdk`

## Priority 4: Tooling Updates (Low Priority)

- Sass legacy JS API is deprecated - will need migration for Dart Sass 2.0
- Vite CJS Node API is deprecated - update vite.config to use ESM
- Update browserslist database: `npx update-browserslist-db@latest`
- Husky `install` command is deprecated - update to newer husky setup
