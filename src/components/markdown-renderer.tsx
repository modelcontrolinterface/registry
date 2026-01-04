"use client"

import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

interface MarkdownPageRendererProps {
  content: string;
}

const MarkdownPageRenderer: React.FC<MarkdownPageRendererProps> = ({
  content,
}) => {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPageRenderer;
