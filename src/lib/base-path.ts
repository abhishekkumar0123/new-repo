export function withBasePath(path: string) {
  if (!path.startsWith("/")) return path;
  return process.env.NODE_ENV === "production" ? `/new-repo${path}` : path;
}
