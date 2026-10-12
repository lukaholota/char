const CHUNK_LOAD_MESSAGE =
  /Failed to load chunk|Loading (CSS )?chunk .+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError" || CHUNK_LOAD_MESSAGE.test(error.message);
}
