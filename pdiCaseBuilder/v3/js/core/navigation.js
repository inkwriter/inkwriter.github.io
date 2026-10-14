export function createNavigation({ onViewChange, onCaseStepChange }) {
  function showView(view) {
    document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === view && el.classList.contains('nav-link')));
    onViewChange?.(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showCaseStep(step) {
    document.querySelectorAll('[data-case-step-panel]').forEach(el => el.classList.toggle('active', el.dataset.caseStepPanel === step));
    document.querySelectorAll('[data-case-step]').forEach(el => el.classList.toggle('active', el.dataset.caseStep === step));
    onCaseStepChange?.(step);
    window.scrollTo({ top: 110, behavior: 'smooth' });
  }
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', () => showView(el.dataset.nav)));
  document.querySelectorAll('[data-case-step]').forEach(el => el.addEventListener('click', () => showCaseStep(el.dataset.caseStep)));
  return { showView, showCaseStep };
}
