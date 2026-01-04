export const packageNameRegex = /^[a-z](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

export const authorRegex = /^([^<(]+?)(?:\s*<([^>]+)>)?(?:\s*\(([^)]+)\))?$/;

export const semanticVersionRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
