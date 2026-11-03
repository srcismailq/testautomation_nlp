interface EvaluablePage {
  evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R>;
  evaluate<R>(fn: () => R): Promise<R>;
}

/** Outline the element matched by a CSS/XPath selector and scroll it into view. */
export async function highlightSelector(
  page: EvaluablePage,
  selector: string,
): Promise<void> {
  await page.evaluate((sel: string) => {
    document.querySelectorAll("[data-ai-found]").forEach((el) => {
      (el as HTMLElement).style.outline = "";
      el.removeAttribute("data-ai-found");
    });

    const clean = sel.startsWith("xpath=") ? sel.slice("xpath=".length) : sel;
    let el: HTMLElement | null = null;
    try {
      el = document.querySelector(clean);
    } catch {
      const result = document.evaluate(
        clean,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      );
      el = result.singleNodeValue as HTMLElement | null;
    }

    if (el) {
      el.style.setProperty("outline", "5px solid #00ff00", "important");
      el.style.outlineOffset = "-5px";
      el.setAttribute("data-ai-found", "true");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, selector);
}

export async function clearHighlight(page: EvaluablePage): Promise<void> {
  await page
    .evaluate(() => {
      document.querySelectorAll("[data-ai-found]").forEach((el) => {
        (el as HTMLElement).style.outline = "";
        el.removeAttribute("data-ai-found");
      });
    })
    .catch(() => {});
}
