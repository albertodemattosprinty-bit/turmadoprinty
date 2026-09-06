import { QUALITY_ASPECTS, QUALITY_GRADIENT, qualityTagIndex } from './quality-data.js';

export function assessQuality({ request, profile, required = false, onSaved = () => {} }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'quality-assessment';
    dialog.setAttribute('aria-label', 'Qualidade de vida em 12 aspectos');
    let step = -1, slide = 0, timer, busy = false;
    const values = {};
    const finish = (result) => {
      clearInterval(timer);
      dialog.close();
      dialog.remove();
      previousFocus?.focus();
      resolve(result);
    };
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (!required && !busy) finish(false);
    });
    function render() {
      clearInterval(timer);
      const aspect = QUALITY_ASPECTS[Math.max(0, step)];
      dialog.innerHTML = `<div class="quality-shell"><header><span>SEU PONTO DE PARTIDA</span>${!required ? '<button type="button" data-close aria-label="Fechar avaliação">×</button>' : ''}</header>
        <main>${step < 0 ? `<h1>Qualidade de vida em 12 aspectos</h1><p>Invista minutos diários no seu futuro.</p><div class="quality-slide"><img src="${aspect.icon}" alt=""><strong>${aspect.name}</strong></div><p>Conheça seu ponto de partida. Depois, conecte tarefas e missões a cada aspecto e transforme pequenas ações em cuidado diário.</p><p class="quality-muted">Avalie como você percebe sua vida nos últimos 90 dias. Não existe resposta certa: este retrato é seu.</p>` : `<p class="quality-muted">Aspecto ${step + 1} de 12 · últimos 90 dias</p><img class="quality-aspect-icon" src="${aspect.icon}" alt=""><h1>${aspect.name}</h1><p>Como este aspecto está na sua vida?</p><output class="quality-value">${values[aspect.id] ?? '—'}%</output><label class="quality-range-label" for="qualityRange">Deslize para escolher seu nível</label><input id="qualityRange" type="range" min="0" max="100" step="1" value="${values[aspect.id] ?? 50}" style="background:${QUALITY_GRADIENT}" aria-describedby="qualityDescription"><p id="qualityDescription" aria-live="polite">${values[aspect.id] == null ? 'Escolha um nível na barra ou nas descrições abaixo.' : aspect.tags[qualityTagIndex(values[aspect.id])]}</p><details><summary>Ver as 20 faixas de ${aspect.name}</summary><div class="quality-tags">${aspect.tags.map((tag, i) => `<button type="button" data-value="${(i + 1) * 5}" aria-pressed="${values[aspect.id] != null && qualityTagIndex(values[aspect.id]) === i}"><b>${i === 0 ? '0–5' : `${i * 5 + 1}–${(i + 1) * 5}`}%</b><span>${tag}</span></button>`).join('')}</div></details>`}</main>
        <footer><p class="quality-error" role="status"></p><div>${step >= 0 ? '<button type="button" data-back>Voltar</button>' : ''}<button type="button" class="quality-next" data-next ${step >= 0 && values[aspect.id] == null ? 'disabled' : ''}>${step < 0 ? 'Avançar' : step === 11 ? 'Salvar meus 12 aspectos' : 'Próximo aspecto'}</button></div></footer></div>`;
      dialog.querySelector('[data-close]')?.addEventListener('click', () => finish(false));
      dialog.querySelector('[data-back]')?.addEventListener('click', () => { step--; render(); });
      const range = dialog.querySelector('input');
      const select = (value) => {
        values[aspect.id] = Number(value);
        range.value = value;
        range.setAttribute('aria-valuetext', `${value}%. ${aspect.tags[qualityTagIndex(value)]}`);
        dialog.querySelector('output').textContent = `${value}%`;
        dialog.querySelector('#qualityDescription').textContent = aspect.tags[qualityTagIndex(value)];
        dialog.querySelector('[data-next]').disabled = false;
        dialog.querySelectorAll('[data-value]').forEach(button => button.setAttribute('aria-pressed', qualityTagIndex(value) === qualityTagIndex(button.dataset.value)));
      };
      range?.addEventListener('input', () => select(range.value));
      range?.addEventListener('change', () => select(range.value));
      dialog.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => select(button.dataset.value)));
      dialog.querySelector('[data-next]').addEventListener('click', async () => {
        if (busy) return;
        if (step < 11) { step++; render(); return; }
        busy = true;
        dialog.querySelectorAll('button,input').forEach(el => { el.disabled = true; });
        dialog.querySelector('.quality-error').textContent = 'Salvando seu ponto de partida…';
        try {
          const result = await request('/api/200/quality-assessment', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, values }), skipGlobalLoading: true, offlineQueue: false });
          if (!result?.assessment?.completed) throw new Error('A avaliação ainda não foi confirmada. Conecte-se e tente novamente.');
          await onSaved(result);
          finish(true);
        } catch (error) {
          busy = false;
          dialog.querySelectorAll('button,input').forEach(el => { el.disabled = false; });
          dialog.querySelector('.quality-error').textContent = error.message || 'Não foi possível salvar. Tente novamente.';
        }
      });
      if (step < 0) timer = setInterval(() => {
        slide = (slide + 1) % QUALITY_ASPECTS.length;
        const current = QUALITY_ASPECTS[slide], element = dialog.querySelector('.quality-slide');
        element.innerHTML = `<img src="${current.icon}" alt=""><strong>${current.name}</strong>`;
      }, 750);
      dialog.querySelector(step < 0 ? '[data-next]' : 'input')?.focus();
    }
    document.body.append(dialog);
    dialog.showModal();
    render();
  });
}
