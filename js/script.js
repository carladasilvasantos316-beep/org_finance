/* ============================================================
   ORGANIZA FINANCE – script.js
   Funções compartilhadas entre todas as páginas.
   Banco de dados: localStorage (chave "organiza_movimentacoes")
   ============================================================ */

// ── Constantes ──────────────────────────────────────────────
const STORAGE_KEY = 'organiza_movimentacoes';
const THEME_KEY = 'organiza_tema';
const FIXAS_KEY = 'organiza_fixas_ativas'; // { "id-YYYY-MM": true/false }
const TEMPLATES_KEY = 'organiza_fixas_templates'; // [ {id, tipo, valor, categoria, data, descricao, bancoId, fixa:true} ]
const BANCOS_KEY = 'organiza_bancos';
const CAT_CUSTOM_KEY = 'organiza_categorias_custom'; // string[]
const METAS_KEY = 'organiza_metas_invest'; // { essencial: 50, variavel: 30, invest: 20 }

const CATEGORIAS = [
    'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação',
    'Lazer', 'Vestuário', 'Serviços', 'Investimento', 'Salário',
    'Freelance', 'Outros'
];

// Grupos de investimento (mapeamento de categorias padrão)
const GRUPOS_INVEST = {
    essencial: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Serviços'],
    variavel: ['Lazer', 'Vestuário', 'Outros'],
    invest: ['Investimento']
};

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

/** Carrega os templates de despesas fixas. */
function carregarTemplates() {
    const dados = localStorage.getItem(TEMPLATES_KEY);
    return dados ? JSON.parse(dados) : [];
}

/** Salva os templates de despesas fixas. */
function salvarTemplates(templates) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

/**
 * Gera um ID único baseado em timestamp + número aleatório.
 * @returns {number}
 */
function gerarId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

/* ============================================================
   BANCOS – Persistência e CRUD
   ============================================================ */

/** Carrega os bancos do localStorage. Se vazio, cria um banco padrão. */
function carregarBancos() {
    const dados = localStorage.getItem(BANCOS_KEY);
    let bancos = dados ? JSON.parse(dados) : [];
    
    if (bancos.length === 0) {
        bancos = [{ id: 1, nome: 'Carteira (Padrão)', saldoInicial: 0, cor: '#10b981' }];
        salvarBancos(bancos);
    }
    return bancos;
}

/** Salva os bancos no localStorage. */
function salvarBancos(bancos) {
    localStorage.setItem(BANCOS_KEY, JSON.stringify(bancos));
}

/** Calcula o saldo de um banco somando saldoInicial + entradas - saídas vinculadas. */
function calcularSaldoBanco(bancoId) {
    const bancos = carregarBancos();
    const banco = bancos.find(b => b.id === bancoId);
    if (!banco) return 0;

    const movimentacoes = carregarMovimentacoes();
    const templates = carregarTemplates();
    const ativas = carregarFixasAtivas();

    let saldo = banco.saldoInicial;

    // Movimentações regulares (agora filtradas para não incluir templates, mas m.fixa no array original era o template)
    movimentacoes.forEach(m => {
        if (m.bancoId !== bancoId) return;
        if (m.tipo === 'entrada') {
            saldo += m.valor;
        } else if (!m.fixa) {
            saldo -= m.valor;
        }
    });

    // Despesas fixas ativadas (agora buscamos no templates)
    Object.entries(ativas).forEach(([chave, isAtiva]) => {
        if (!isAtiva) return;
        const match = chave.match(/^(\d+)-(\d{4})-(\d{2})$/);
        if (!match) return;
        const movId = parseInt(match[1]);
        const m = templates.find(mov => mov.id === movId) || movimentacoes.find(mov => mov.id === movId);
        if (m && m.bancoId === bancoId) {
            saldo -= m.valor;
        }
    });

    return saldo;
}

function adicionarBanco(nome, saldoInicial, cor) {
    const bancos = carregarBancos();
    const novo = {
        id: gerarId(),
        nome,
        saldoInicial: parseFloat(saldoInicial) || 0,
        cor: cor || '#3b82f6'
    };
    bancos.push(novo);
    salvarBancos(bancos);
    return novo;
}

function removerBanco(id) {
    let bancos = carregarBancos();
    if (bancos.length <= 1) {
        alert('Você deve manter pelo menos um banco.');
        return false;
    }
    bancos = bancos.filter(b => b.id !== id);
    salvarBancos(bancos);
    return true;
}

/** Popula o select de bancos no formulário de movimentação. */
function popularBancosSelect() {
    const sel = document.getElementById('form-banco');
    if (!sel) return;
    const bancos = carregarBancos();
    sel.innerHTML = '<option value="">Selecione um banco...</option>' + 
                    bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
}

/** Renderiza a lista de bancos na página bancos.html. */
function atualizarBancosUI() {
    const container = document.getElementById('lista-bancos');
    if (!container) return;

    const bancos = carregarBancos();
    container.innerHTML = bancos.map(b => {
        const saldo = calcularSaldoBanco(b.id);
        return `
        <div class="card banco-card" style="border-left: 5px solid ${b.cor}; cursor:pointer;" onclick="mostrarMovimentacoesBanco(${b.id})">
          <div class="banco-header">
            <h3 class="banco-nome">${b.nome}</h3>
            <button class="btn btn-icon" onclick="event.stopPropagation(); deletarBanco(${b.id})" title="Excluir Banco">🗑</button>
          </div>
          <div class="banco-body">
            <div class="stat-label">Saldo Atual</div>
            <div class="stat-value ${saldo >= 0 ? 'positive' : 'negative'}">${formatarMoeda(saldo)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">
              Saldo Inicial: ${formatarMoeda(b.saldoInicial)}
            </div>
            <div style="font-size:0.7rem; color:var(--accent); margin-top:0.5rem; font-weight:600;">Clique para ver detalhes →</div>
          </div>
        </div>`;
    }).join('');
}

/**
 * Mostra as movimentações vinculadas a um banco específico.
 * @param {number} bankId 
 */
function mostrarMovimentacoesBanco(bankId) {
    const container = document.getElementById('banco-detalhes-container');
    const tbody = document.getElementById('tbody-banco-movimentos');
    const titulo = document.getElementById('banco-detalhes-titulo');
    if (!container || !tbody) return;

    const bancos = carregarBancos();
    const banco = bancos.find(b => b.id === bankId);
    if (!banco) return;

    titulo.textContent = `Movimentações: ${banco.nome}`;

    // Coletar movimentações do banco
    const movimentacoes = carregarMovimentacoes().filter(m => m.bancoId === bankId && !m.fixa);
    
    // Coletar ativações de fixas deste banco (simplificado: mostra no mês atual como exemplo ou todas?)
    // Vamos mostrar todas as ativações já registradas no histórico
    const templates = carregarTemplates();
    const ativas = carregarFixasAtivas();
    const fixasDoBanco = [];

    Object.entries(ativas).forEach(([chave, isAtiva]) => {
        if (!isAtiva) return;
        const match = chave.match(/^(\d+)-(\d{4})-(\d{2})$/);
        if (!match) return;
        const movId = parseInt(match[1]);
        const m = templates.find(mov => mov.id === movId);
        if (m && m.bancoId === bankId) {
            fixasDoBanco.push({
                ...m,
                data: `${match[2]}-${match[3]}-01`, // Data da ativação (dia 1)
                descricao: `(FIXA) ${m.descricao || m.categoria}`
            });
        }
    });

    const todas = [...movimentacoes, ...fixasDoBanco]
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (todas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:2rem;">Nenhuma movimentação neste banco.</div></td></tr>`;
    } else {
        tbody.innerHTML = todas.map(m => `
            <tr>
                <td>${formatarData(m.data)}</td>
                <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
                <td><span class="badge badge-cat">${m.categoria}</span></td>
                <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
                <td>${m.descricao || '–'}</td>
            </tr>
        `).join('');
    }

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function deletarBanco(id) {
    if (!confirm('Tem certeza? Movimentações vinculadas a este banco NÃO serão apagadas, mas perderão o vínculo.')) return;
    if (removerBanco(id)) {
        atualizarBancosUI();
        mostrarToast('Banco removido.');
    }
}

/* ============================================================
   ADICIONAR / REMOVER movimentações
   ============================================================ */

/**
 * Adiciona uma nova movimentação ao localStorage.
 * @param {Object} dados - { tipo, valor, categoria, data, descricao, bancoId }
 * @returns {Object} - movimentação criada com id
 */
function adicionarMovimentacao(dados) {
    const nova = {
        id: gerarId(),
        tipo: dados.tipo,          // "entrada" | "saida"
        valor: parseFloat(dados.valor),
        categoria: dados.categoria,
        data: dados.data,
        descricao: dados.descricao || '',
        bancoId: parseInt(dados.bancoId) || 1,
        fixa: dados.fixa || false
    };

    if (nova.fixa) {
        const templates = carregarTemplates();
        templates.push(nova);
        salvarTemplates(templates);
    } else {
        const movimentacoes = carregarMovimentacoes();
        movimentacoes.push(nova);
        salvarMovimentacoes(movimentacoes);
    }
    return nova;
}

/**
 * Retorna uma movimentação pelo ID.
 */
function buscarMovimentacaoPorId(id) {
    const todos = [...carregarMovimentacoes(), ...carregarTemplates()];
    return todos.find(m => m.id === id);
}

/**
 * Salva a edição de uma movimentação.
 */
function atualizarMovimentacao(id, novosDados) {
    const movimentacoes = carregarMovimentacoes();
    const idxMov = movimentacoes.findIndex(m => m.id === id);
    if (idxMov !== -1) {
        movimentacoes[idxMov] = { ...movimentacoes[idxMov], ...novosDados };
        salvarMovimentacoes(movimentacoes);
        return true;
    }

    const templates = carregarTemplates();
    const idxTempl = templates.findIndex(m => m.id === id);
    if (idxTempl !== -1) {
        templates[idxTempl] = { ...templates[idxTempl], ...novosDados };
        salvarTemplates(templates);
        return true;
    }

    return false;
}

/**
 * Remove uma movimentação pelo ID.
 * @param {number} id
 */
function removerMovimentacao(id) {
    let movimentacoes = carregarMovimentacoes();
    const novaLista = movimentacoes.filter(m => m.id !== id);
    if (novaLista.length !== movimentacoes.length) {
        salvarMovimentacoes(novaLista);
        return;
    }

    let templates = carregarTemplates();
    const novaListaTempl = templates.filter(m => m.id !== id);
    if (novaListaTempl.length !== templates.length) {
        salvarTemplates(novaListaTempl);
    }
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
    const templates = carregarTemplates();
    const ativas = carregarFixasAtivas();
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const mesStrAtual = getMesAtualStr();

    // Mapa de despesas fixas (templates + legadas se houver)
    const fixasMap = {};
    templates.filter(m => m.fixa && m.tipo === 'saida').forEach(m => { fixasMap[m.id] = m; });
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
        tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <p>Nenhuma movimentação registrada ainda.</p>
      </div>
    </td></tr>`;
        return;
    }

    const bancos = carregarBancos();

    tbody.innerHTML = movimentacoes.map(m => {
        const banco = bancos.find(b => b.id === m.bancoId) || { nome: '–' };
        return `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td><span style="font-size:0.75rem; color:var(--text-muted)">${banco.nome}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td>${m.descricao || '–'}</td>
      <td style="text-align:right;">
        <button class="btn btn-icon" onclick="prepararEdicao(${m.id})" title="Editar">✏️</button>
      </td>
    </tr>
  `;
    }).join('');
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

    // Apenas movimentações regulares (não fixas)
    const movimentacoes = carregarMovimentacoes()
        .filter(m => !m.fixa)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    if (movimentacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Nenhuma movimentação cadastrada ainda.</p>
      </div>
    </td></tr>`;
        return;
    }

    const bancos = carregarBancos();

    tbody.innerHTML = movimentacoes.map(m => {
        const banco = bancos.find(b => b.id === m.bancoId) || { nome: '–' };
        return `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td>
        <span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span>
      </td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td><span class="badge" style="background:var(--bg-card); border:1px solid var(--border); color:var(--text-secondary); font-size:0.75rem;">${banco.nome}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td>${m.descricao || '–'}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn btn-icon" onclick="prepararEdicao(${m.id})" title="Editar">✏️</button>
        <button class="btn btn-danger" onclick="excluirMovimentacao(${m.id})" style="padding:0.3rem 0.6rem; font-size:0.75rem;">🗑</button>
      </td>
    </tr>
  `;
    }).join('');
}

/**
 * Exclui uma movimentação e atualiza a tabela (chamado via onclick).
 * @param {number} id
 */
function excluirMovimentacao(id) {
    const m = buscarMovimentacaoPorId(id);
    const msg = m && m.fixa 
        ? '⚠️ Esta é uma DESPESA FIXA. Excluí-la removerá a definição permanente e ela não aparecerá mais nos próximos meses.\n\nDeseja continuar?' 
        : 'Deseja excluir esta movimentação?';
        
    if (!confirm(msg)) return;
    removerMovimentacao(id);
    atualizarTabelaMovimentacoes();
    atualizarSecaoFixas();
    if (document.getElementById('stat-saldo')) atualizarDashboard();
    if (document.getElementById('secao-fixas-dash')) atualizarFixasDashboard();
    mostrarToast('🗑 Removido com sucesso.');
}

/**
 * Remove todos os registros EXCETO as saídas marcadas como fixas.
 * As ativações mensais das fixas são preservadas.
 */
function limparRegistros() {
    const movs = carregarMovimentacoes().filter(m => !m.fixa);
    const total = movs.length;
    if (total === 0) { mostrarToast('ℹ️ Nenhum registro para limpar.'); return; }

    const ok = confirm(
        `⚠️ Isso irá apagar todos os ${total} registro(s) do histórico.\n\n` +
        `As despesas fixas mensais serão mantidas.\n\n` +
        `Deseja continuar?`
    );
    if (!ok) return;

    // Mantém apenas o que for fixa (se ainda houver algo no array principal por migração pendente)
    const movimentacoes = carregarMovimentacoes();
    const fixas = movimentacoes.filter(m => m.fixa === true);
    salvarMovimentacoes(fixas);

    // Esvazia as movimentações regulares
    if (fixas.length === 0) {
        salvarMovimentacoes([]);
    }

    // Atualiza toda a UI
    atualizarTabelaMovimentacoes();
    atualizarSecaoFixas();
    if (document.getElementById('stat-saldo')) atualizarDashboard();
    if (document.getElementById('secao-fixas-dash')) atualizarFixasDashboard();

    mostrarToast(`🗑 Histórico limpo.`);
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

    // Carrega das duas fontes enquanto houver migração pendente, mas prioriza templates
    const fixas = [...carregarTemplates(), ...carregarMovimentacoes().filter(m => m.fixa)].filter(m => m.tipo === 'saida');
    
    // Remove duplicatas por ID (caso a migração tenha acabado de ocorrer)
    const uniqueFixas = [];
    const ids = new Set();
    fixas.forEach(f => {
        if (!ids.has(f.id)) {
            uniqueFixas.push(f);
            ids.add(f.id);
        }
    });

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
          <div class="fixa-actions-wrap" style="display:flex; align-items:center; gap:1.5rem;">
            <div class="fixa-mgmt-btns" style="display:flex; gap:0.4rem;">
                <button class="btn btn-icon" onclick="prepararEdicao(${m.id})" title="Editar definição" style="font-size:0.85rem; padding:0.2rem;">✏️</button>
                <button class="btn btn-icon" onclick="excluirMovimentacao(${m.id})" title="Excluir definição" style="font-size:0.85rem; padding:0.2rem;">🗑</button>
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

    const fixas = [...carregarTemplates(), ...carregarMovimentacoes().filter(m => m.fixa)].filter(m => m.tipo === 'saida');

    // Remove duplicatas por ID
    const uniqueFixas = [];
    const ids = new Set();
    fixas.forEach(f => {
        if (!ids.has(f.id)) { uniqueFixas.push(f); ids.add(f.id); }
    });

    if (uniqueFixas.length === 0) { container.innerHTML = ''; return; }

    const mesStr = getMesAtualStr();
    const ativas = carregarFixasAtivas();
    const ativasCount = uniqueFixas.filter(m => ativas[`${m.id}-${mesStr}`] === true).length;
    const totalAtivas = uniqueFixas.filter(m => ativas[`${m.id}-${mesStr}`] === true)
        .reduce((s, m) => s + m.valor, 0);

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div>
            <div class="card-title">Despesas Fixas do Mês</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);">${ativasCount} de ${uniqueFixas.length} ativadas</div>
          </div>
          <a href="html/movimentacoes.html#fixas" class="btn" style="background:rgba(245,158,11,0.12);color:#f59e0b;font-size:0.8rem;padding:0.4rem 0.85rem;">Gerenciar →</a>
        </div>
        <div class="fixas-lista">
          ${uniqueFixas.map(m => {
        const ativa = ativas[`${m.id}-${mesStr}`] === true;
        return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                   <div style="display:flex; flex-direction:column;">
                      <span style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${m.descricao || m.categoria}</span>
                      <span class="val-saida" style="font-size:0.8rem;">${formatarMoeda(m.valor)}</span>
                   </div>
                </div>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="display:flex; gap:0.3rem;">
                        <button class="btn btn-icon" onclick="prepararEdicao(${m.id})" title="Editar" style="font-size:0.8rem; padding:0.2rem;">✏️</button>
                        <button class="btn btn-icon" onclick="excluirMovimentacao(${m.id})" title="Excluir" style="font-size:0.8rem; padding:0.2rem;">🗑</button>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" ${ativa ? 'checked' : ''} onchange="toggleAtivacaoFixa(${m.id}, '${mesStr}')">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
              </div>`;
    }).join('')}
        </div>
        ${totalAtivas > 0 ? `<div style="text-align:right;margin-top:0.75rem;font-size:0.82rem;color:var(--text-muted);">Total ativo: <span class="val-saida">${formatarMoeda(totalAtivas)}</span></div>` : ''}
      </div>`;
}

/* ============================================================
   FORMULÁRIO – Submissão (movimentacoes.html)
   ============================================================ */

/** Retorna categorias personalizadas salvas */
function carregarCatsCustom() {
    const d = localStorage.getItem(CAT_CUSTOM_KEY);
    return d ? JSON.parse(d) : [];
}

/** Salva categorias personalizadas */
function salvarCatsCustom(cats) {
    localStorage.setItem(CAT_CUSTOM_KEY, JSON.stringify(cats));
}

/** Retorna todas as categorias (padrão + personalizadas), ordenadas */
function todasCategorias() {
    const custom = carregarCatsCustom();
    return [...CATEGORIAS, ...custom];
}

/** Adiciona uma categoria personalizada (evita duplicatas) */
function adicionarCatCustom(nome) {
    nome = nome.trim();
    if (!nome) return false;
    if (todasCategorias().some(c => c.toLowerCase() === nome.toLowerCase())) return false;
    const cats = carregarCatsCustom();
    cats.push(nome);
    salvarCatsCustom(cats);
    return true;
}

/** Remove uma categoria personalizada */
function removerCatCustom(nome) {
    const cats = carregarCatsCustom().filter(c => c !== nome);
    salvarCatsCustom(cats);
}

/** Popula o select de categorias (padrão + personalizadas) */
function popularCategorias() {
    const sel = document.getElementById('form-categoria');
    if (!sel) return;
    const custom = carregarCatsCustom();
    const optPadrao = CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('');
    const optCustom = custom.length
        ? '<option disabled>── Personalizadas ──</option>' +
        custom.map(c => `<option value="${c}">${c}</option>`).join('')
        : '';
    sel.innerHTML = '<option value="">Selecione...</option>' + optPadrao + optCustom;
    renderizarGerenciadorCats();
}

/**
 * Renderiza o painel de gerenciamento de categorias personalizadas
 * logo abaixo do select #form-categoria.
 */
function renderizarGerenciadorCats() {
    const sel = document.getElementById('form-categoria');
    if (!sel) return;

    // Cria o container uma vez
    let box = document.getElementById('gerenciador-cats');
    if (!box) {
        box = document.createElement('div');
        box.id = 'gerenciador-cats';
        sel.parentNode.appendChild(box);
    }

    const custom = carregarCatsCustom();

    const tagsHtml = custom.length
        ? custom.map(c => `
            <span class="cat-tag">
                ${c}
                <button type="button" class="cat-tag-remove" onclick="_removeCat('${c.replace(/'/g, "\\'")}')"
                        title="Remover ${c}">×</button>
            </span>`).join('')
        : '<span style="color:var(--text-muted);font-size:0.78rem;">Nenhuma categoria criada</span>';

    box.innerHTML = `
        <div class="gerenciador-cats-wrap">
            <div class="cats-tags-row">${tagsHtml}</div>
            <div class="cats-add-row" style="margin-top:0.5rem">
                <input id="nova-cat-input" type="text" class="form-control"
                       placeholder="Nova categoria..." maxlength="40"
                       style="flex:1;width:auto;min-width:0;font-size:0.82rem;padding:0.35rem 0.6rem;color:var(--text-primary);background:var(--bg-input);"
                       onkeydown="if(event.key==='Enter'){event.preventDefault();_addCat();}" />
                <button type="button" class="btn btn-primary"
                        style="width:auto;flex-shrink:0;font-size:0.8rem;padding:0.35rem 0.85rem;white-space:nowrap;margin-top:0;"
                        onclick="_addCat()">+ Adicionar</button>
            </div>
        </div>`;
}

/* ============================================================
   EDIÇÃO VIA MODAL
   ============================================================ */

let idParaEditar = null;
let tipoEdicao = 'entrada';

function prepararEdicao(id) {
    const m = buscarMovimentacaoPorId(id);
    if (!m) return;

    idParaEditar = id;
    tipoEdicao = m.tipo;

    // Preenche o modal
    document.getElementById('edit-valor').value = m.valor;
    document.getElementById('edit-data').value = m.data;
    document.getElementById('edit-descricao').value = m.descricao;

    // Popula categorias e bancos no modal
    popularCategoriasModal(m.categoria);
    popularBancosModal(m.bancoId);

    // Ajusta visual dos botões de tipo no modal
    selecionarTipoEdicao(m.tipo);

    // Abre o modal
    document.getElementById('modal-edicao').style.display = 'flex';
}

function fecharModalEdicao() {
    idParaEditar = null;
    document.getElementById('modal-edicao').style.display = 'none';
}

function selecionarTipoEdicao(tipo) {
    tipoEdicao = tipo;
    document.querySelectorAll('.modal .type-btn').forEach(btn => {
        btn.classList.remove('active-entrada', 'active-saida');
    });
    const btn = document.getElementById('edit-btn-' + tipo);
    if (btn) btn.classList.add('active-' + tipo);
}

function popularCategoriasModal(selecionado) {
    const sel = document.getElementById('edit-categoria');
    const custom = carregarCatsCustom();
    const optPadrao = CATEGORIAS.map(c => `<option value="${c}" ${c === selecionado ? 'selected' : ''}>${c}</option>`).join('');
    const optCustom = custom.map(c => `<option value="${c}" ${c === selecionado ? 'selected' : ''}>${c}</option>`).join('');
    sel.innerHTML = optPadrao + optCustom;
}

function popularBancosModal(selecionado) {
    const sel = document.getElementById('edit-banco');
    const bancos = carregarBancos();
    sel.innerHTML = bancos.map(b => `<option value="${b.id}" ${b.id === selecionado ? 'selected' : ''}>${b.nome}</option>`).join('');
}

function confirmarEdicao(e) {
    e.preventDefault();
    if (!idParaEditar) return;

    const novosDados = {
        tipo: tipoEdicao,
        valor: parseFloat(document.getElementById('edit-valor').value),
        data: document.getElementById('edit-data').value,
        categoria: document.getElementById('edit-categoria').value,
        bancoId: parseInt(document.getElementById('edit-banco').value),
        descricao: document.getElementById('edit-descricao').value.trim()
    };

    if (atualizarMovimentacao(idParaEditar, novosDados)) {
        fecharModalEdicao();
        mostrarToast('✅ Alterações salvas!');
        
        // Recarrega o que estiver visível
        if (typeof atualizarDashboard === 'function') atualizarDashboard();
        if (typeof atualizarTabelaMovimentacoes === 'function') atualizarTabelaMovimentacoes();
        if (typeof atualizarRelatorio === 'function') atualizarRelatorio();
        if (typeof atualizarCalendario === 'function') atualizarCalendario();
    if (typeof atualizarInvest === 'function') atualizarInvest();
    }
}

/* ── Controle Modal Ajuda ── */
function abrirModalAjuda() {
    const modal = document.getElementById('modal-ajuda');
    if (modal) modal.style.display = 'flex';
}

function fecharModalAjuda() {
    const modal = document.getElementById('modal-ajuda');
    if (modal) modal.style.display = 'none';
}

/* ============================================================
   INVESTIMENTO (50/30/20)
   ============================================================ */

const METAS_PADRAO = { essencial: 50, variavel: 30, invest: 20 };

function carregarMetas() {
    const d = localStorage.getItem(METAS_KEY);
    return d ? JSON.parse(d) : METAS_PADRAO;
}

function salvarMetas(metas) {
    localStorage.setItem(METAS_KEY, JSON.stringify(metas));
}

function atualizarInvest() {
    if (!document.getElementById('invest-graph')) return;


    const metas = carregarMetas();
    const movs = carregarMovimentacoes();
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    // Filtra gastos do mês atual (saídas e ativações fixas)
    const totais = calcularDistribuicaoInvest(movs, mes, ano);
    const totalGastos = totais.essencial + totais.variavel + totais.invest;

    // Atualiza porcentagens reais
    const percEssencial = totalGastos > 0 ? (totais.essencial / totalGastos) * 100 : 0;
    const percVariavel = totalGastos > 0 ? (totais.variavel / totalGastos) * 100 : 0;
    const percInvest = totalGastos > 0 ? (totais.invest / totalGastos) * 100 : 0;

    // UI - Porcentagens
    if (document.getElementById('perc-essencial')) document.getElementById('perc-essencial').textContent = percEssencial.toFixed(1) + '%';
    if (document.getElementById('perc-variavel')) document.getElementById('perc-variavel').textContent = percVariavel.toFixed(1) + '%';
    if (document.getElementById('perc-invest')) document.getElementById('perc-invest').textContent = percInvest.toFixed(1) + '%';

    // UI - Valores e Maiores
    if (document.getElementById('val-essencial')) document.getElementById('val-essencial').textContent = formatarMoeda(totais.essencial);
    if (document.getElementById('val-variavel')) document.getElementById('val-variavel').textContent = formatarMoeda(totais.variavel);
    if (document.getElementById('val-invest')) document.getElementById('val-invest').textContent = formatarMoeda(totais.invest);

    if (document.getElementById('max-essencial')) document.getElementById('max-essencial').textContent = formatarMoeda(totais.maxEssencial);
    if (document.getElementById('max-variavel')) document.getElementById('max-variavel').textContent = formatarMoeda(totais.maxVariavel);
    if (document.getElementById('max-invest')) document.getElementById('max-invest').textContent = formatarMoeda(totais.maxInvest);

    // Gráfico (CSS conic-gradient)
    const graph = document.getElementById('invest-graph');
    if (graph) {
        const seg1 = percEssencial;
        const seg2 = seg1 + percVariavel;
        graph.style.background = `conic-gradient(
            var(--accent) 0% ${seg1}%, 
            #fbbf24 ${seg1}% ${seg2}%, 
            var(--income) ${seg2}% 100%
        )`;
    }

    // inputs de metas
    if (document.getElementById('meta-essencial')) document.getElementById('meta-essencial').value = metas.essencial;
    if (document.getElementById('meta-variavel')) document.getElementById('meta-variavel').value = metas.variavel;
    if (document.getElementById('meta-invest')) document.getElementById('meta-invest').value = metas.invest;
}

function calcularDistribuicaoInvest(movs, mes, ano) {
    const ativas = carregarFixasAtivas();
    const mesStr = (mes + 1).toString().padStart(2, '0');
    const chaveMes = `${ano}-${mesStr}`;
    
    let ess = 0, varia = 0, inv = 0;
    let mEss = 0, mVaria = 0, mInv = 0;

    // Categorias customizadas são tratadas como variavel por padrão, a menos que o usuário as mapeie (futuro)
    // Para simplificar, verificamos se a categoria está em algum grupo
    const getGrupo = (cat) => {
        if (GRUPOS_INVEST.essencial.includes(cat)) return 'essencial';
        if (GRUPOS_INVEST.invest.includes(cat)) return 'invest';
        return 'variavel';
    };

    movs.forEach(m => {
        const d = new Date(m.data + 'T00:00:00');
        // Ignora fixas (templates legados)
        if (d.getMonth() === mes && d.getFullYear() === ano && m.tipo === 'saida' && !m.fixa) {
            const grupo = getGrupo(m.categoria);
            if (grupo === 'essencial') { ess += m.valor; if(m.valor > mEss) mEss = m.valor; }
            else if (grupo === 'invest') { inv += m.valor; if(m.valor > mInv) mInv = m.valor; }
            else { varia += m.valor; if(m.valor > mVaria) mVaria = m.valor; }
        }
    });

    const templates = carregarTemplates();

    // Fixas Ativas
    Object.entries(ativas).forEach(([chave, ativa]) => {
        if (!ativa || !chave.endsWith(chaveMes)) return;
        const id = parseInt(chave.split('-')[0]);
        const m = templates.find(mov => mov.id === id) || movs.find(mov => mov.id === id);
        if (m) {
            ess += m.valor;
            if (m.valor > mEss) mEss = m.valor;
        }
    });

    return { essencial: ess, variavel: varia, invest: inv, maxEssencial: mEss, maxVariavel: mVaria, maxInvest: mInv };
}

/** 
 * Exibe a lista minimalista de movimentações para um pilar específico.
 * @param {'essencial'|'variavel'|'invest'} pilar
 */
function mostrarDetalhesPilar(pilar) {
    const container = document.getElementById('pilar-details-container');
    if (!container) return;

    // Se clicar no mesmo pilar que já está aberto, fecha
    if (container.dataset.pilar === pilar && container.style.display === 'block') {
        container.style.display = 'none';
        return;
    }

    const movs = carregarMovimentacoes();
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();
    const ativas = carregarFixasAtivas();
    const mesStr = (mes + 1).toString().padStart(2, '0');
    const chaveMes = `${ano}-${mesStr}`;

    const getGrupo = (cat) => {
        if (GRUPOS_INVEST.essencial.includes(cat)) return 'essencial';
        if (GRUPOS_INVEST.invest.includes(cat)) return 'invest';
        return 'variavel';
    };

    // Filtra movimentos do pilar no mês atual
    const lista = [];

    // Regulares
    movs.forEach(m => {
        // Ignora fixas (templates legados)
        if (!m.fixa) {
            const d = new Date(m.data + 'T00:00:00');
            if (d.getMonth() === mes && d.getFullYear() === ano && m.tipo === 'saida') {
                if (getGrupo(m.categoria) === pilar) lista.push(m);
            }
        }
    });

    const templates = carregarTemplates();

    // Fixas Ativas
    Object.entries(ativas).forEach(([chave, ativa]) => {
        if (!ativa || !chave.endsWith(chaveMes)) return;
        const id = parseInt(chave.split('-')[0]);
        const m = templates.find(mov => mov.id === id) || movs.find(mov => mov.id === id);
        if (m && pilar === 'essencial') {
            lista.push({ ...m, data: `${ano}-${mesStr}-01` });
        }
    });

    // Ordena por data (mais recente primeiro)
    lista.sort((a, b) => new Date(b.data) - new Date(a.data));

    renderizarListaMinimalista(container, lista, pilar);
}

function renderizarListaMinimalista(container, lista, pilar) {
    container.style.display = 'block';
    container.dataset.pilar = pilar;
    
    const cores = {
        essencial: 'var(--accent)',
        variavel: '#fbbf24',
        invest: 'var(--income)'
    };

    const nomes = {
        essencial: 'Essenciais',
        variavel: 'Variáveis',
        invest: 'Investimento'
    };

    let html = `
        <div class="mini-list-header">
            <h4 style="color: ${cores[pilar]}">Movimentações: ${nomes[pilar]}</h4>
            <button class="btn-icon" onclick="this.parentElement.parentElement.style.display='none'">&times;</button>
        </div>
        <div class="mini-list-body">
    `;

    if (lista.length === 0) {
        html += `<p class="empty-mini">Nenhum gasto registrado neste pilar este mês.</p>`;
    } else {
        html += lista.map(m => `
            <div class="mini-item">
                <div class="mini-info">
                    <span class="mini-desc">${m.descricao || m.categoria}</span>
                    <span class="mini-date">${formatarData(m.data)}</span>
                </div>
                <div class="mini-val">${formatarMoeda(m.valor)}</div>
            </div>
        `).join('');
    }

    html += `</div>`;
    container.innerHTML = html;
    
    // Scroll suave até o container
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function salvarNovasMetas() {
    const ess = parseInt(document.getElementById('meta-essencial').value) || 0;
    const varia = parseInt(document.getElementById('meta-variavel').value) || 0;
    const inv = parseInt(document.getElementById('meta-invest').value) || 0;

    if (ess + varia + inv !== 100) {
        mostrarToast('⚠️ A soma das metas deve ser 100%!');
        return;
    }

    salvarMetas({ essencial: ess, variavel: varia, invest: inv });
    atualizarInvest();
    mostrarToast('✅ Metas atualizadas!');
}

/** Handler interno: adicionar categoria via UI */
function _addCat() {
    const input = document.getElementById('nova-cat-input');
    if (!input) return;
    const ok = adicionarCatCustom(input.value);
    if (!ok) {
        input.style.borderColor = 'var(--expense)';
        setTimeout(() => { input.style.borderColor = ''; }, 1200);
        return;
    }
    input.value = '';
    popularCategorias();
    popularCategoriasRelatorio();
    mostrarToast('✅ Categoria adicionada!');
}

/** Handler interno: remover categoria via UI */
function _removeCat(nome) {
    removerCatCustom(nome);
    popularCategorias();
    popularCategoriasRelatorio();
    mostrarToast('🗑 Categoria removida.');
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
    const bancoId = document.getElementById('form-banco').value;
    const data = document.getElementById('form-data').value;
    const descricao = document.getElementById('form-descricao').value.trim();
    const fixa = tipoAtual === 'saida' && document.getElementById('form-fixa')?.checked;

    if (!valor || valor <= 0) { alert('Informe um valor válido.'); return; }
    if (!categoria) { alert('Selecione uma categoria.'); return; }
    if (!bancoId) { alert('Selecione um banco.'); return; }
    if (!data) { alert('Informe a data.'); return; }

    adicionarMovimentacao({ tipo: tipoAtual, valor, categoria, data, descricao, bancoId, fixa });
    mostrarToast(fixa ? '📌 Despesa fixa cadastrada!' : '✅ Movimentação registrada com sucesso!');
    e.target.reset();
    selecionarTipo('entrada');
    atualizarTabelaMovimentacoes();
    atualizarSecaoFixas();
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

    const movimentacoes = carregarMovimentacoes().filter(m => !m.fixa);
    const hoje = new Date();

    const ano = calData.getFullYear();
    const mes = calData.getMonth(); // 0-indexed
    const mesStr = (mes + 1).toString().padStart(2, '0');
    const chaveMes = `${ano}-${mesStr}`;
    const ativas = carregarFixasAtivas();
    const templates = carregarTemplates();

    // Primeiro dia do mês e total de dias
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const inicioSemana = primeiroDia.getDay(); // 0=Dom

    // Mapa de eventos: { "YYYY-MM-DD": [movimentacao, ...] }
    const mapaEventos = {};
    movimentacoes.forEach(m => {
        if (m.data.startsWith(`${ano}-${mesStr}`)) {
            if (!mapaEventos[m.data]) mapaEventos[m.data] = [];
            mapaEventos[m.data].push(m);
        }
    });

    // Adiciona fixas ativadas no dia 01 (como referência simplificada no calendário)
    Object.entries(ativas).forEach(([chave, ativa]) => {
        if (ativa && chave.endsWith(chaveMes)) {
            const id = parseInt(chave.split('-')[0]);
            const m = templates.find(t => t.id === id);
            if (m) {
                // Extrai o dia da data original do template (ex: "2026-03-15" -> dia 15)
                const partes = m.data.split('-');
                const diaDefinido = partes[2] || '01';
                const dataFixa = `${ano}-${mesStr}-${diaDefinido.padStart(2, '0')}`;
                
                if (!mapaEventos[dataFixa]) mapaEventos[dataFixa] = [];
                mapaEventos[dataFixa].push({ ...m, descricao: `(FIXA) ${m.descricao || m.categoria}` });
            }
        }
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
        .filter(m => !m.fixa) // Relatório agora foca apenas em registros históricos
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
        tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Nenhuma movimentação encontrada com os filtros aplicados.</p>
      </div>
    </td></tr>`;
        return;
    }

    const bancos = carregarBancos();

    tbody.innerHTML = movimentacoes.map(m => {
        const banco = bancos.find(b => b.id === m.bancoId) || { nome: '–' };
        return `
    <tr>
      <td>${formatarData(m.data)}</td>
      <td><span class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
      <td><span class="badge badge-cat">${m.categoria}</span></td>
      <td><span style="font-size:0.75rem; color:var(--text-muted)">${banco.nome}</span></td>
      <td class="val-${m.tipo}">${formatarMoeda(m.valor)}</td>
      <td>${m.descricao || '–'}</td>
      <td style="text-align:right;">
        <button class="btn btn-icon" onclick="prepararEdicao(${m.id})" title="Editar">✏️</button>
      </td>
    </tr>
  `;
    }).join('');
}

/** Popula selects de categoria no relatório (padrão + personalizadas) */
function popularCategoriasRelatorio() {
    const sel = document.getElementById('filtro-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="todas">Todas</option>' +
        todasCategorias().map(c => `<option value="${c}">${c}</option>`).join('');
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

/**
 * Migra despesas fixas que estão no array de movimentações para o array de templates.
 * Chamada uma única vez na inicialização.
 */
function migrarFixas() {
    const movimentacoes = carregarMovimentacoes();
    const fixasParaMigrar = movimentacoes.filter(m => m.fixa);
    
    if (fixasParaMigrar.length > 0) {
        const templates = carregarTemplates();
        
        fixasParaMigrar.forEach(f => {
            // Evita duplicatas se já existirem no templates por algum motivo
            if (!templates.some(t => t.id === f.id)) {
                templates.push(f);
            }
        });
        
        const novasMovimentacoes = movimentacoes.filter(m => !m.fixa);
        
        salvarTemplates(templates);
        salvarMovimentacoes(novasMovimentacoes);
        console.log(`[Migração] ${fixasParaMigrar.length} despesas fixas movidas para novo storage.`);
    }
}

/* ============================================================
   INIT – Detecta a página e inicializa
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

    // Migra dados antigos (executa apenas se necessário)
    migrarFixas();

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
        popularBancosSelect();
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

    // Página de Bancos
    if (document.getElementById('lista-bancos') !== null) {
        atualizarBancosUI();
        document.getElementById('form-banco-add')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('banco-nome').value.trim();
            const saldo = document.getElementById('banco-saldo').value;
            const cor = document.getElementById('banco-cor').value;
            if (nome) {
                adicionarBanco(nome, saldo, cor);
                atualizarBancosUI();
                e.target.reset();
                mostrarToast('Banco adicionado!');
            }
        });
    }

    // Dashboard – seção de despesas fixas
    if (document.getElementById('secao-fixas-dash') !== null) {
        atualizarFixasDashboard();
    }

    // Investimento
    if (document.getElementById('invest-graph') !== null) {
        atualizarInvest();
        document.getElementById('btn-salvar-metas')?.addEventListener('click', salvarNovasMetas);
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
