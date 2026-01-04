import path from "path";
import { promises as fs } from "fs";
import MarkdownPageRenderer from "@/components/markdown-renderer";

export default async function CodeOfConductPage() {
  const markdownPath = path.join(process.cwd(), "src", "content", "code-of-conduct.md");
  const markdown = await fs.readFile(markdownPath, "utf-8");

  return (
    <div className="container mx-auto px-4 py-8">
      <MarkdownPageRenderer content={markdown} />
    </div>
  );
}
