export enum PackageSort {
  Relevance = "relevance",
  Downloads = "downloads",
  Newest = "newest",
  Oldest = "oldest",
  NameAsc = "name-asc",
  NameDesc = "name-desc",
  Updated = "updated",
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
  Interceptor = "interceptor",
}

export enum PackageDeprecated {
  All = "all",
  Deprecated = "deprecated",
  NotDeprecated = "not-deprecated",
}