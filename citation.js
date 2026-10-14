const button = document.querySelector('#citation-copy');
const citation = document.querySelector('#citation-bibtex');

if (button && citation) {
  const label = button.querySelector('[role="status"]');
  let resetTimer;

  function copyWithSelection(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(field);
    try {
      field.select();
      return document.execCommand('copy');
    } finally {
      field.remove();
    }
  }

  button.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    button.disabled = true;
    button.classList.remove('is-copied');
    const text = citation.textContent.trim();
    let copied = false;
    try {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = copyWithSelection(text);
      }
    } catch {
      copied = false;
    } finally {
      button.disabled = false;
      button.focus({ preventScroll: true });
    }
    button.classList.toggle('is-copied', copied);
    label.textContent = copied ? 'Copied' : 'Copy failed';
    resetTimer = setTimeout(() => {
      label.textContent = 'Copy';
      button.classList.remove('is-copied');
    }, 2400);
  });
}
