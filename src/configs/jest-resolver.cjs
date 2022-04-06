module.exports = (request, options) =>
  options.defaultResolver(request, {
    ...options,
    packageFilter: ({ main, exports, ...pkg }) => ({
      ...pkg,
      // For some reason Jest uses the "main" entry point for packages even when
      // ESM conditions are provided. Remove it in this case to force it to use
      // exports
      ...(exports ? { exports } : { main }),
    }),
  })
