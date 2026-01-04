import MarkdownPageRenderer from "@/components/markdown-page-renderer";
import { promises as fs } from "fs";
import path from "path";

export default async function PrivacyPolicyPage() {
  const markdownPath = path.join(
    process.cwd(),
    "src",
    "content",
    "privacy-policy.md",
  );
  const markdown = await fs.readFile(markdownPath, "utf-8");

  return (
    <div className="container mx-auto px-4 py-8">
      <MarkdownPageRenderer content={markdown} />
    </div>
  );
}
