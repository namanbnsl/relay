export type ReadingSource = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

export const initialSources: ReadingSource[] = [
  {
    id: "github",
    name: "GitHub Blog",
    url: "https://github.blog/",
    enabled: true,
  },
  {
    id: "anthropic",
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    enabled: true,
  },
];
