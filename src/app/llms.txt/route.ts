import { llmsText } from "@/features/marketing/seo";
import { getAboutPage, getPublishedFaq } from "@/features/site-content/queries";

/** saasclair.com/llms.txt : SaasClair résumé pour ChatGPT, Gemini, Claude, Perplexity… */
export async function GET() {
  const [faq, about] = await Promise.all([getPublishedFaq(), getAboutPage()]);
  const aboutText = about ? [about.intro, about.body].filter(Boolean).join("\n\n") : null;
  return new Response(llmsText({ faq, about: aboutText }), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
