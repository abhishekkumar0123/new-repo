const BASE_PATH = "/new-repo";

export function withBasePath(path: string) {
  if (!path.startsWith("/")) return path;

  const normalized =
    path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)
      ? path.slice(BASE_PATH.length)
      : path;

  return process.env.NODE_ENV === "production"
    ? `${BASE_PATH}${normalized || "/"}`
    : normalized;
}
