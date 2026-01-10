export enum PackageSort {
  Newest = "newest",
  Oldest = "oldest",
  Updated = "updated",
  NameAsc = "name-asc",
  NameDesc = "name-desc",
  Relevance = "relevance",
  Downloads = "downloads",
}

export enum PackageVerified {
  All = "all",
  Verified = "verified",
  Unverified = "unverified",
}

export enum PackageCategory {
  All = "all",
  Hook = "hook",
  Server = "server",
  Sandbox = "sandbox",
  Language = "language",
  Interceptor = "interceptor",
}

export enum PackageDeprecated {
  All = "all",
  Deprecated = "deprecated",
  NotDeprecated = "not-deprecated",
}
