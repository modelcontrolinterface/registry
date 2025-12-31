import { promises as fs } from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default async function CodeOfConductPage() {
  const markdownPath = path.join(process.cwd(), 'src', 'content', 'code-of-conduct.md');
  const markdown = await fs.readFile(markdownPath, 'utf-8');

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}
