export function exerciseVideoSearch(name: string) {
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set(
    "search_query",
    `${name.trim()} richtige Ausführung Technik`,
  );
  return url.toString();
}
