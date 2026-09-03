// `tsc --noEmit` needs the whole project's type graph, not a subset of
// files — lint-staged would otherwise append the staged filenames to the
// command, which breaks tsc's module resolution. Using a function (instead
// of a plain command string) ignores those filenames and just runs the
// full check once, whenever any TypeScript file is staged.
export default {
  '**/*.{ts,tsx}': () => 'npm run lint',
};
