import path from "path";
import remarkGfm from "remark-gfm";
import { promises as fs } from "fs";
import { notFound } from "next/navigation";
import rehypeHighlight from "rehype-highlight";
import { Card, CardContent } from "@/components/ui/card";

import ReactMarkdown from "react-markdown";

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const markdownPath = path.join(process.cwd(), "src", "content", "policies", `${slug}.md`);

  let markdown: string;

  try {
    markdown = await fs.readFile(markdownPath, "utf-8");
  } catch (error) {
    notFound();
  }

  return (
    <div className="container mx-auto my-8 max-w-4xl">
      <Card>
        <CardContent className="p-6">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
