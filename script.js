/* ============================================================
   ORGANIZA FINANCE – script.js
   Funções compartilhadas entre todas as páginas.
   Banco de dados: localStorage (chave "organiza_movimentacoes")
   ============================================================ */

// ── Constantes ──────────────────────────────────────────────
const STORAGE_KEY = 'organiza_movimentacoes';
const THEME_KEY = 'organiza_tema';
const FIXAS_KEY = 'organiza_fixas_ativas'; // { "id-YYYY-MM": true/false }

const CATEGORIAS = [
    'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação',
    'Lazer', 'Vestuário', 'Serviços', 'Investimento', 'Salário',
    'Freelance', 'Outros'
];

/**
 * Carrega o mapa de ativações de despesas fixas.
 * Formato: { "id-YYYY-MM": true }
 */
function carregarFixasAtivas() {
    const dados = localStorage.getItem(FIXAS_KEY);
    return dados ? JSON.parse(dados) : {};
}

/** Salva o mapa de ativações. */
function salvarFixasAtivas(ativas) {
    localStorage.setItem(FIXAS_KEY, JSON.stringify(ativas));
}

/**
 * Verifica se uma despesa fixa está ativada para o mês/ano informado.
 * @param {number} id
 * @param {string} mesStr - formato "YYYY-MM"
 */
function isFixaAtiva(id, mesStr) {
    const ativas = carregarFixasAtivas();
    return ativas[`${id}-${mesStr}`] === true;
}

/** Gera string "YYYY-MM" para o mês atual. */
function getMesAtualStr() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

/* ============================================================
   TEMA – Claro / Escuro
   ============================================================ */

/**
 * Aplica o tema ao documento e atualiza o ícone do botão.
 * @param {'dark'|'light'} tema
 */
function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem(THEME_KEY, tema);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = tema === 'dark' ? '🌙' : '☀️';
}

/** Alterna entre tema escuro e claro (chamado pelo onclick do botão). */
function toggleTheme() {
    const atual = document.documentElement.getAttribute('data-theme') || 'dark';
    aplicarTema(atual === 'dark' ? 'light' : 'dark');
}

/** Carrega o tema salvo no localStorage (padrão: dark). */
function carregarTema() {
    const tema = localStorage.getItem(THEME_KEY) || 'dark';
    aplicarTema(tema);
}

/* ============================================================
   STORAGE – Salvar e carregar
   ============================================================ */

/**
 * Salva o array de movimentações no localStorage.
 * @param {Array} movimentacoes
 */
function salvarMovimentacoes(movimentacoes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movimentacoes));
}

/**
 * Carrega e retorna o array de movimentações do localStorage.
 * Retorna [] caso não exista nenhum dado ainda.
 * @returns {Array}
 */
function carregarMovimentacoes() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
}

/**
 * Gera um ID único baseado em timestamp + número aleatório.
 * @returns {number}
 */
function gerarId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

/* ============================================================
   ADICIONAR / REMOVER movimentações
   ============================================================ */

/**
 * Adiciona uma nova movimentação ao localStorage.
 * @param {Object} dados - { tipo, valor, categoria, data, descricao, justificativa }
 * @returns {Object} - movimentação criada com id
 */
function adicionarMovimentacao(dados) {
    const movimentacoes = carregarMovimentacoes();
    const nova = {
        id: gerarId(),
        tipo: dados.tipo,          // "entrada" | "saida"
        valor: parseFloat(dados.valor),
        categoria: dados.categoria,
        data: dados.data,
        descricao: dados.descricao || '',
        justificativa: dados.justificativa || '',
        fixa: dados.fixa || false  // se true: saída fixa mensal, requer ativação manual
    };
    movimentacoes.push(nova);
    salvarMovimentacoes(movimentacoes);
    return nova;
}

/**
 * Remove uma movimentação pelo ID.
 * @param {number} id
 */
function removerMovimentacao(id) {
    let movimentacoes = carregarMovimentacoes();
    movimentacoes = movimentacoes.filter(m => m.id !== id);
    salvarMovimentacoes(movimentacoes);
}

/* ============================================================
   HELPERS – Formatação
   ============================================================ */

/**
 * Formata um número como moeda BRL.
 * @param {number} valor
 * @returns {string} ex: "R$ 1.200,00"
 */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata uma string de data "YYYY-MM-DD" para "DD/MM/YYYY".
 * @param {string} dataStr
 * @returns {string}
 */
function formatarData(dataStr) {
    if (!dataStr) return '–';
    const [y, m, d] = dataStr.split('-');
    return `${d}/${m}/${y}`;
}

/**
 * Retorna o mês/ano por extenso a partir de um objeto Date.
 * @param {Date} date
 * @returns {string} ex: "Março 2026"
 */
function nomeMesAno(date) {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/^\w/, c => c.toUpperCase());
}

/** Exibe o toast de confirmação */
function mostrarToast(msg = '✅ Movimentação registrada!') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('hide');
    setTimeout(() => {
        toast.classList.add('hide');
    }, 2800);
}

/* ============================================================
   DASHBOARD – Cálculos e atualização
   ============================================================ */

/**
 * Calcula totais de saldo, entradas e saídas do mês corrente.
 * @returns {Object} { saldo, entradaMes, saidaMes, total }
 */
function calcularTotais() {
    const movimentacoes = carregarMovimentacoes();
    const ativas = carregarFixasAtivas();
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const mesStrAtual = getMesAtualStr();

    // Mapa de despesas fixas: id → movimentação
    const fixasMap = {};
    movimentacoes.filter(m => m.fixa && m.tipo === 'saida').forEach(m => { fixasMap[m.id] = m; });

    let entradaTotal = 0;
    let saidaTotal = 0;
    let entradaMes = 0;
    let saidaMes = 0;

    // Processa movimentações regulares (não fixas)
    movimentacoes.forEach(m => {
        const d = new Date(m.data + 'T00:00:00');
        const ehMesAtual = d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        if (m.tipo === 'entrada') {
            entradaTotal += m.valor;
            if (ehMesAtual) entradaMes += m.valor;
        } else if (!m.fixa) {
            // Saída normal sempre conta
            saidaTotal += m.valor;
            if (ehMesAtual) saidaMes += m.valor;
        }
        // Saídas fixas são processadas separadamente (por ativações)
    });

    // Processa ativações de despesas fixas (histórico completo)
    Object.entries(ativas).forEach(([chave, isAtiva]) => {
        if (!isAtiva) return;
        // chave: "id-YYYY-MM"
        const match = chave.match(/^(\d+)-(\d{4})-(\d{2})$/);
        if (!match) return;
        const fixa = fixasMap[parseInt(match[1])];
        if (!fixa) return;
        saidaTotal += fixa.valor;
        if (`${match[2]}-${match[3]}` === mesStrAtual) saidaMes += fixa.valor;
    });

    return {
        saldo: entradaTotal - saidaTotal,
        entradaMes,
        saidaMes,
        total: movimentacoes.length
    };
}

/**
 * Atualiza os cards do Dashboard com os valores calculados.
 */
function atualizarDashboard() {
    const totais = calcularTotais();

    const elSaldo = document.getElementById('stat-saldo');
    const elEntrada = document.getElementById('stat-entrada');
    const elSaida = document.getElementById('stat-saida');
    const elTotal = document.getElementById('stat-total');

    if (elSaldo) {
        elSaldo.textContent = formatarMoeda(totais.saldo);
        elSaldo.className = 'stat-value ' + (totais.saldo >= 0 ? 'positive' : 'negative');
    }
    if (elEntrada) elEntrada.textContent = formatarMoeda(totais.entradaMes);
    if (elSaida) elSaida.textContent = formatarMoeda(totais.saidaMes);
    if (elTotal) elTotal.textContent = totais.total;

    // Lista de recentes no dashboard
    atualizarTabelaRecentes();
}

/**
 * Atualiza a tabela de movimentações recentes na dashboard (últimas 5).
 */
function atualizarTabelaRecentes() {
    const tbody = document.getElementById('tbody-recentes');
    if (!tbody) return;

    const movimentacoes = carregarMovimentacoes()
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 5);

    if (movimentacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <p>Nenhuma movimentação registrada ainda.</p>
      </div>
    </td></tr>`;
        return;
    }

    tbody.innerHTML = movimentacoes.map(m => `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td>${m.descricao || '–'}</td>
    </tr>
  `).join('');
}

/* ============================================================
   MOVIMENTAÇÕES – Tabela completa
   ============================================================ */

/**
 * Atualiza a tabela de todas as movimentações na página movimentacoes.html.
 */
function atualizarTabelaMovimentacoes() {
    const tbody = document.getElementById('tbody-movimentos');
    if (!tbody) return;

    const movimentacoes = carregarMovimentacoes()
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (movimentacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Nenhuma movimentação cadastrada ainda.</p>
      </div>
    </td></tr>`;
        return;
    }

    tbody.innerHTML = movimentacoes.map(m => `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td>
        <span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span>
        ${m.fixa ? '<span class="badge badge-fixa">📌 Fixa</span>' : ''}
      </td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td>${m.descricao || '–'}</td>
      <td>
        <button class="btn btn-danger" onclick="excluirMovimentacao(${m.id})">🗑 Excluir</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Exclui uma movimentação e atualiza a tabela (chamado via onclick).
 * @param {number} id
 */
function excluirMovimentacao(id) {
    if (!confirm('Deseja excluir esta movimentação?')) return;
    removerMovimentacao(id);
    atualizarTabelaMovimentacoes();
    atualizarSecaoFixas();
    mostrarToast('🗑 Movimentação excluída.');
}

/**
 * Remove todos os registros EXCETO as saídas marcadas como fixas.
 * As ativações mensais das fixas são preservadas.
 */
function limparRegistros() {
    const total = carregarMovimentacoes().filter(m => !m.fixa).length;
    if (total === 0) { mostrarToast('ℹ️ Nenhum registro para limpar.'); return; }

    const ok = confirm(
        `⚠️ Isso irá apagar ${total} registro(s).\n\n` +
        `As despesas fixas serão mantidas.\n\n` +
        `Deseja continuar?`
    );
    if (!ok) return;

    const movimentacoes = carregarMovimentacoes();
    const fixas = movimentacoes.filter(m => m.fixa === true);
    salvarMovimentacoes(fixas);

    // Atualiza toda a UI
    atualizarTabelaMovimentacoes();
    atualizarSecaoFixas();
    if (document.getElementById('stat-saldo')) atualizarDashboard();
    if (document.getElementById('secao-fixas-dash')) atualizarFixasDashboard();

    const mantidas = fixas.length;
    mostrarToast(`🗑 Registros apagados. ${mantidas > 0 ? mantidas + ' fixa(s) mantida(s).' : ''}`);
}

/* ============================================================
   DESPESAS FIXAS – Seção de gerenciamento mensal
   ============================================================ */

/**
 * Ativa ou desativa uma despesa fixa para o mês atual.
 * Chamado pelo toggle switch na seção de fixas.
 * @param {number} id
 * @param {string} mesStr - "YYYY-MM"
 */
function toggleAtivacaoFixa(id, mesStr) {
    const ativas = carregarFixasAtivas();
    const chave = `${id}-${mesStr}`;
    ativas[chave] = !ativas[chave];
    salvarFixasAtivas(ativas);
    // Atualiza UI em todas as seções relevantes
    atualizarSecaoFixas();
    if (document.getElementById('stat-saldo')) atualizarDashboard();
    if (document.getElementById('secao-fixas-dash')) atualizarFixasDashboard();
}

/**
 * Renderiza a seção de despesas fixas na página de movimentações.
 * Mostra todas as saídas marcadas como 'fixa' com toggle para o mês atual.
 */
function atualizarSecaoFixas() {
    const container = document.getElementById('secao-fixas');
    if (!container) return;

    const fixas = carregarMovimentacoes().filter(m => m.fixa && m.tipo === 'saida');
    const mesStr = getMesAtualStr();
    const mesNome = nomeMesAno(new Date());
    const labelEl = document.getElementById('fixas-mes-label');
    if (labelEl) labelEl.textContent = `Gerencie para ${mesNome}`;

    if (fixas.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding:2rem;">
            <div class="empty-icon">📌</div>
            <p>Nenhuma despesa fixa cadastrada.<br>Marque uma saída como <strong>"Fixa mensal"</strong> ao registrá-la.</p>
          </div>`;
        return;
    }

    const ativas = carregarFixasAtivas();
    container.innerHTML = fixas.map(m => {
        const chave = `${m.id}-${mesStr}`;
        const ativa = ativas[chave] === true;
        return `
        <div class="fixa-item ${ativa ? 'ativa' : ''}">
          <div class="fixa-info">
            <div class="fixa-nome">${m.descricao || m.categoria}</div>
            <div class="fixa-detalhe">
              <span class="badge badge-cat">${m.categoria}</span>
              <span class="val-saida" style="font-size:0.9rem;">${formatarMoeda(m.valor)}</span>
            </div>
          </div>
          <div class="fixa-toggle">
            <span style="font-size:0.75rem;color:${ativa ? 'var(--income)' : 'var(--text-muted)'}; font-weight:600;">
              ${ativa ? 'Ativa ✓' : 'Inativa'}
            </span>
            <label class="toggle-switch" title="${ativa ? 'Desativar' : 'Ativar'} para ${mesNome}">
              <input type="checkbox" ${ativa ? 'checked' : ''}
                     onchange="toggleAtivacaoFixa(${m.id}, '${mesStr}')">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>`;
    }).join('');
}

/**
 * Renderiza o resumo de despesas fixas no Dashboard.
 */
function atualizarFixasDashboard() {
    const container = document.getElementById('secao-fixas-dash');
    if (!container) return;

    const fixas = carregarMovimentacoes().filter(m => m.fixa && m.tipo === 'saida');
    if (fixas.length === 0) { container.innerHTML = ''; return; }

    const mesStr = getMesAtualStr();
    const ativas = carregarFixasAtivas();
    const ativasCount = fixas.filter(m => ativas[`${m.id}-${mesStr}`] === true).length;
    const totalAtivas = fixas.filter(m => ativas[`${m.id}-${mesStr}`] === true)
        .reduce((s, m) => s + m.valor, 0);

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <div class="card-title">Despesas Fixas do Mês</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);">${ativasCount} de ${fixas.length} ativadas</div>
          </div>
          <a href="html/movimentacoes.html#fixas" class="btn" style="background:rgba(245,158,11,0.12);color:#f59e0b;font-size:0.8rem;padding:0.4rem 0.85rem;">Gerenciar →</a>
        </div>
        <div class="fixas-lista">
          ${fixas.map(m => {
        const ativa = ativas[`${m.id}-${mesStr}`] === true;
        return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border);">
                <div>
                  <span style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${m.descricao || m.categoria}</span>
                  <span class="val-saida" style="font-size:0.8rem;margin-left:0.5rem;">${formatarMoeda(m.valor)}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${ativa ? 'checked' : ''} onchange="toggleAtivacaoFixa(${m.id}, '${mesStr}')">
                  <span class="toggle-slider"></span>
                </label>
              </div>`;
    }).join('')}
        </div>
        ${totalAtivas > 0 ? `<div style="text-align:right;margin-top:0.75rem;font-size:0.82rem;color:var(--text-muted);">Total ativo: <span class="val-saida">${formatarMoeda(totalAtivas)}</span></div>` : ''}
      </div>`;
}

/* ============================================================
   FORMULÁRIO – Submissão (movimentacoes.html)
   ============================================================ */

/** Popula o select de categorias */
function popularCategorias() {
    const sel = document.getElementById('form-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione...</option>' +
        CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('');
}

/** Tipo selecionado no form (entrada|saida) */
let tipoAtual = 'entrada';

/**
 * Seleciona o tipo no formulário e atualiza botões.
 * @param {'entrada'|'saida'} tipo
 */
function selecionarTipo(tipo) {
    tipoAtual = tipo;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active-entrada', 'active-saida');
    });
    const btn = document.getElementById('btn-tipo-' + tipo);
    if (btn) btn.classList.add('active-' + tipo);
    // Mostra opção de fixa somente para saídas
    const grupoFixa = document.getElementById('grupo-fixa');
    if (grupoFixa) grupoFixa.style.display = tipo === 'saida' ? 'flex' : 'none';
    // Reseta o checkbox ao trocar de tipo
    const cbFixa = document.getElementById('form-fixa');
    if (cbFixa && tipo === 'entrada') cbFixa.checked = false;
}

/**
 * Handler do submit do formulário de nova movimentação.
 * @param {Event} e
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const valor = parseFloat(document.getElementById('form-valor').value);
    const categoria = document.getElementById('form-categoria').value;
    const data = document.getElementById('form-data').value;
    const descricao = document.getElementById('form-descricao').value.trim();
    const justificativa = document.getElementById('form-justificativa').value.trim();
    const fixa = tipoAtual === 'saida' && document.getElementById('form-fixa')?.checked;

    if (!valor || valor <= 0) { alert('Informe um valor válido.'); return; }
    if (!categoria) { alert('Selecione uma categoria.'); return; }
    if (!data) { alert('Informe a data.'); return; }

    adicionarMovimentacao({ tipo: tipoAtual, valor, categoria, data, descricao, justificativa, fixa });
    mostrarToast(fixa ? '📌 Despesa fixa cadastrada!' : '✅ Movimentação registrada com sucesso!');
    e.target.reset();
    selecionarTipo('entrada');
    atualizarTabelaMovimentacoes();
    atualizarSecaoFixas();
}

/* ============================================================
   JUSTIFICATIVAS – página justificativas.html
   ============================================================ */

/**
 * Atualiza a tabela de movimentações com justificativa.
 */
function atualizarJustificativas() {
    const tbody = document.getElementById('tbody-justificativas');
    if (!tbody) return;

    const movimentacoes = carregarMovimentacoes()
        .filter(m => m.justificativa && m.justificativa.trim() !== '')
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (movimentacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Nenhuma movimentação com justificativa cadastrada.</p>
      </div>
    </td></tr>`;
        return;
    }

    tbody.innerHTML = movimentacoes.map(m => `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td style="color: var(--text-secondary); font-size: 0.85rem;">${m.justificativa}</td>
    </tr>
  `).join('');
}

/* ============================================================
   CALENDÁRIO – página calendario.html
   ============================================================ */

let calData = new Date(); // mês exibido no calendário

/**
 * Renderiza o calendário do mês indicado.
 * @param {Date} ref - data de referência (mês e ano)
 */
function atualizarCalendario(ref) {
    if (ref) calData = ref;

    const titulo = document.getElementById('cal-titulo');
    const grid = document.getElementById('cal-grid');
    if (!titulo || !grid) return;

    titulo.textContent = nomeMesAno(calData);

    const movimentacoes = carregarMovimentacoes();
    const hoje = new Date();

    const ano = calData.getFullYear();
    const mes = calData.getMonth(); // 0-indexed

    // Primeiro dia do mês e total de dias
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const inicioSemana = primeiroDia.getDay(); // 0=Dom

    // Mapa de eventos: { "YYYY-MM-DD": [movimentacao, ...] }
    const mapaEventos = {};
    movimentacoes.forEach(m => {
        if (!mapaEventos[m.data]) mapaEventos[m.data] = [];
        mapaEventos[m.data].push(m);
    });

    let html = '';

    // Células de dias do mês anterior (offset)
    const diasAnterior = new Date(ano, mes, 0).getDate();
    for (let i = inicioSemana - 1; i >= 0; i--) {
        html += `<div class="cal-cell other-month">
      <div class="cal-date">${diasAnterior - i}</div>
    </div>`;
    }

    // Dias do mês atual
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const ehHoje = (hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano);
        const eventos = mapaEventos[dataStr] || [];

        const eventosHtml = eventos.slice(0, 3).map(m =>
            `<div class="cal-event ${m.tipo}" title="${m.categoria}: ${formatarMoeda(m.valor)}">
        ${m.tipo === 'entrada' ? '+' : '-'} ${formatarMoeda(m.valor)}
      </div>`
        ).join('');

        const mais = eventos.length > 3
            ? `<div style="font-size:0.62rem; color:var(--text-muted)">+${eventos.length - 3} mais</div>`
            : '';

        html += `<div class="cal-cell ${ehHoje ? 'today' : ''}">
      <div class="cal-date">${dia}</div>
      ${eventosHtml}${mais}
    </div>`;
    }

    // Células restantes para completar a grade (próximo mês)
    const totalCelulas = inicioSemana + diasNoMes;
    const restante = totalCelulas % 7 === 0 ? 0 : 7 - (totalCelulas % 7);
    for (let i = 1; i <= restante; i++) {
        html += `<div class="cal-cell other-month"><div class="cal-date">${i}</div></div>`;
    }

    grid.innerHTML = html;
}

/* Funções de navegação do calendário */
function calAnterior() {
    calData = new Date(calData.getFullYear(), calData.getMonth() - 1, 1);
    atualizarCalendario();
}

function calProximo() {
    calData = new Date(calData.getFullYear(), calData.getMonth() + 1, 1);
    atualizarCalendario();
}

/* ============================================================
   RELATÓRIO – página relatorio.html
   ============================================================ */

/**
 * Atualiza a tabela do relatório geral, com suporte a filtros.
 * @param {Object} filtros - { tipo, categoria, dataInicio, dataFim }
 */
function atualizarRelatorio(filtros = {}) {
    const tbody = document.getElementById('tbody-relatorio');
    const elTotalE = document.getElementById('rel-total-entrada');
    const elTotalS = document.getElementById('rel-total-saida');
    const elSaldo = document.getElementById('rel-saldo');
    if (!tbody) return;

    let movimentacoes = carregarMovimentacoes()
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    // Aplicar filtros
    if (filtros.tipo && filtros.tipo !== 'todos') {
        movimentacoes = movimentacoes.filter(m => m.tipo === filtros.tipo);
    }
    if (filtros.categoria && filtros.categoria !== 'todas') {
        movimentacoes = movimentacoes.filter(m => m.categoria === filtros.categoria);
    }
    if (filtros.dataInicio) {
        movimentacoes = movimentacoes.filter(m => m.data >= filtros.dataInicio);
    }
    if (filtros.dataFim) {
        movimentacoes = movimentacoes.filter(m => m.data <= filtros.dataFim);
    }

    // Totais filtrados
    const totalE = movimentacoes.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
    const totalS = movimentacoes.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
    if (elTotalE) elTotalE.textContent = formatarMoeda(totalE);
    if (elTotalS) elTotalS.textContent = formatarMoeda(totalS);
    if (elSaldo) {
        elSaldo.textContent = formatarMoeda(totalE - totalS);
        elSaldo.className = 'stat-value ' + (totalE - totalS >= 0 ? 'positive' : 'negative');
    }

    if (movimentacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Nenhuma movimentação encontrada com os filtros aplicados.</p>
      </div>
    </td></tr>`;
        return;
    }

    tbody.innerHTML = movimentacoes.map(m => `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td>${m.descricao || '–'}</td>
      <td style="font-size:0.82rem; color:var(--text-secondary)">${m.justificativa || '–'}</td>
    </tr>
  `).join('');
}

/** Popula selects de categoria no relatório */
function popularCategoriasRelatorio() {
    const sel = document.getElementById('filtro-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="todas">Todas</option>' +
        CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('');
}

/** Lê os filtros do relatório e re-renderiza */
function aplicarFiltros() {
    const filtros = {
        tipo: document.getElementById('filtro-tipo')?.value || 'todos',
        categoria: document.getElementById('filtro-categoria')?.value || 'todas',
        dataInicio: document.getElementById('filtro-inicio')?.value || '',
        dataFim: document.getElementById('filtro-fim')?.value || ''
    };
    atualizarRelatorio(filtros);
}

/* ============================================================
   INIT – Detecta a página e inicializa
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

    // Restaura o tema salvo (deve ser a primeira ação)
    carregarTema();

    // Ativa link da navbar correspondente à página atual
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href').split('/').pop();
        if (href === paginaAtual) link.classList.add('active');
    });

    // Dashboard
    if (document.getElementById('stat-saldo') !== null) {
        atualizarDashboard();
    }

    // Movimentações
    if (document.getElementById('form-movimentacao') !== null) {
        popularCategorias();
        selecionarTipo('entrada');
        atualizarTabelaMovimentacoes();
        atualizarSecaoFixas();

        document.getElementById('form-movimentacao')
            .addEventListener('submit', handleFormSubmit);

        document.getElementById('btn-tipo-entrada')
            .addEventListener('click', () => selecionarTipo('entrada'));
        document.getElementById('btn-tipo-saida')
            .addEventListener('click', () => selecionarTipo('saida'));
    }

    // Dashboard – seção de despesas fixas
    if (document.getElementById('secao-fixas-dash') !== null) {
        atualizarFixasDashboard();
    }

    // Justificativas
    if (document.getElementById('tbody-justificativas') !== null) {
        atualizarJustificativas();
    }

    // Calendário
    if (document.getElementById('cal-grid') !== null) {
        atualizarCalendario(new Date());
        document.getElementById('btn-cal-anterior')?.addEventListener('click', calAnterior);
        document.getElementById('btn-cal-proximo')?.addEventListener('click', calProximo);
    }

    // Relatório
    if (document.getElementById('tbody-relatorio') !== null) {
        popularCategoriasRelatorio();
        atualizarRelatorio();
        document.getElementById('btn-filtrar')?.addEventListener('click', aplicarFiltros);
        document.getElementById('btn-limpar')?.addEventListener('click', () => {
            document.getElementById('filtro-tipo').value = 'todos';
            document.getElementById('filtro-categoria').value = 'todas';
            document.getElementById('filtro-inicio').value = '';
            document.getElementById('filtro-fim').value = '';
            atualizarRelatorio();
        });
    }
});
