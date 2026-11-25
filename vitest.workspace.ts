// Brace-glob so packages created later in the build (backend, frontend) are
// picked up when they exist, without erroring while they don't yet.
export default ["{shared,backend,frontend}"];
