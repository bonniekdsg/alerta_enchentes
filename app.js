// app.js

// Variável global para armazenar a instância do gráfico
let historicoChart = null;

// Função para inicializar o sistema
function inicializarSistema() {
    console.log('Inicializando sistema de monitoramento de enchentes...');

    // Carregar dados dos municípios
    carregarDados();

    // Configurar botões de filtro
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filtro = btn.getAttribute('data-filtro');
            const termoBusca = document.getElementById('municipio-busca').value;
            carregarMunicipios(filtro, termoBusca);
        });
    });

    // Configurar campo de busca
    const campoBusca = document.getElementById('municipio-busca');
    if (campoBusca) {
        campoBusca.addEventListener('input', function () {
            const filtroAtivo = document.querySelector('.btn-filtro.active').getAttribute('data-filtro');
            const termoBusca = campoBusca.value;
            carregarMunicipios(filtroAtivo, termoBusca);
        });
    }

    // Configurar botão de modo noturno
    const btnModoNoturno = document.getElementById('toggle-dark-mode');
    if (btnModoNoturno) {
        btnModoNoturno.addEventListener('click', function (e) {
            e.preventDefault();
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('modoNoturno', document.body.classList.contains('dark-mode') ? 'ativado' : 'desativado');
        });
    }

    // Carregar preferência de tema salva
    if (localStorage.getItem('modoNoturno') === 'ativado') {
        document.body.classList.add('dark-mode');
    }

    console.log('Sistema inicializado com sucesso!');
}

// Inicializar o sistema quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', inicializarSistema);

// Função para carregar dados de enchentes
async function carregarDados() {
    console.log('Carregando dados de enchentes...');

    try {
        const resposta = await fetch('dados.json?v=1.0.1');
    
        if (!resposta.ok) {
            throw new Error(`Erro ao carregar dados: ${resposta.status} ${resposta.statusText}`);
        }

        const dados = await resposta.json();
        console.log('Dados carregados com sucesso:', dados);

        // Associar alertas aos municípios
        Object.keys(dados.municipios).forEach(municipioId => {
            dados.municipios[municipioId].alertas = dados.alertas.filter(alerta => alerta.municipioId === municipioId);
        });

        localStorage.setItem('dadosEnchentes', JSON.stringify(dados));
        processarDados(dados);
        return dados;
    } catch (erro) {
        console.error('Erro ao carregar dados do servidor:', erro);

        const dadosSalvos = localStorage.getItem('dadosEnchentes');
        if (dadosSalvos) {
            try {
                console.log('Usando dados salvos no localStorage');
                const dados = JSON.parse(dadosSalvos);
                // Associar alertas aos municípios
                Object.keys(dados.municipios).forEach(municipioId => {
                    dados.municipios[municipioId].alertas = dados.alertas.filter(alerta => alerta.municipioId === municipioId);
                });
                processarDados(dados);
                return dados;
            } catch (erroLocal) {
                console.error('Erro ao processar dados salvos:', erroLocal);
            }
        }

        console.warn('Carregando dados de exemplo');
        const dadosExemplo = carregarDadosExemplo();
        // Associar alertas aos municípios no dados de exemplo
        Object.keys(dadosExemplo.municipios).forEach(municipioId => {
            dadosExemplo.municipios[municipioId].alertas = dadosExemplo.alertas.filter(alerta => alerta.municipioId === municipioId);
        });
        processarDados(dadosExemplo);
        return dadosExemplo;
    }
}

// Função para processar e exibir os dados
function processarDados(dados) {
    if (!dados || !dados.municipios) {
        console.error('Dados inválidos - formato incorreto');
        return;
    }

    console.log('Processando dados para exibição');

    // Atualizar data de última atualização
    atualizarDataUltimaAtualizacao(dados.ultimaAtualizacao);

    // Carregar municípios
    carregarMunicipios();

    // Atualizar estatísticas
    atualizarEstatisticas(dados);
}

// Função atualizada para carregar os cards dos municípios com layout refinado
function carregarMunicipios(filtro = 'todos', termoBusca = '') {
    const listaMunicipios = document.getElementById('lista-municipios');
    const mensagemSemResultados = document.getElementById('mensagem-sem-resultados');
    if (!listaMunicipios || !mensagemSemResultados) {
        console.error('Elementos lista-municipios ou mensagem-sem-resultados não encontrados.');
        return;
    }

    listaMunicipios.innerHTML = '';
    mensagemSemResultados.style.display = 'none';

    const dadosSalvos = localStorage.getItem('dadosEnchentes');
    if (!dadosSalvos) {
        console.error('Nenhum dado encontrado no localStorage.');
        return;
    }

    const dados = JSON.parse(dadosSalvos);
    let municipiosFiltrados = Object.entries(dados.municipios);

    

    // Filtrar por termo de busca
    if (termoBusca) {
        const termoLower = termoBusca.toLowerCase();
        municipiosFiltrados = municipiosFiltrados.filter(([_, municipio]) =>
            municipio.nome.toLowerCase().includes(termoLower) ||
            municipio.rio.toLowerCase().includes(termoLower)
        );
    }

    // Filtrar por status ou alertas
    if (filtro !== 'todos') {
        if (filtro === 'com-alertas') {
            municipiosFiltrados = municipiosFiltrados.filter(([_, municipio]) =>
                municipio.alertas && municipio.alertas.length > 0
            );
        } else {
            const statusMap = { 'alto': 'alto', 'medio': 'medio', 'baixo': 'baixo' };
            const status = statusMap[filtro];
            municipiosFiltrados = municipiosFiltrados.filter(([_, municipio]) =>
                municipio.risco === status
            );
        }

    
    }

    // Ordenar por nível de risco (alto > médio > baixo)
    municipiosFiltrados.sort((a, b) => {
        const prioridade = (risco) => {
            if (risco === 'alto') return 3;
            if (risco === 'medio') return 2;
            return 1;
        };
        return prioridade(b[1].risco) - prioridade(a[1].risco);
    });

    if (municipiosFiltrados.length === 0) {
        mensagemSemResultados.innerHTML = '<p class="text-muted text-center">Nenhum município encontrado.</p>';
        mensagemSemResultados.style.display = 'block';
        return;
    }

    municipiosFiltrados.forEach(([id, municipio]) => {
        // Map risk level to display text and badge class
        let riscoTexto, riscoClasse;
        switch(municipio.risco) {
            case 'alto':
                riscoTexto = 'Alto';
                riscoClasse = 'alto';
                break;
            case 'medio':
                riscoTexto = 'Médio';
                riscoClasse = 'medio';
                break;
            default:
                riscoTexto = 'Normal';
                riscoClasse = 'normal';
        }

        // Format trend display
        let tendenciaTexto, tendenciaIcone, tendenciaClasse;
        switch(municipio.tendencia) {
            case 'subindo':
                tendenciaTexto = 'Subindo';
                tendenciaIcone = 'arrow-up';
                tendenciaClasse = 'subindo';
                break;
            case 'descendo':
                tendenciaTexto = 'Descendo';
                tendenciaIcone = 'arrow-down';
                tendenciaClasse = 'descendo';
                break;
            default:
                tendenciaTexto = 'Estável';
                tendenciaIcone = 'equals';
                tendenciaClasse = 'estavel';
        }

        // Format variation display with sign
        const variacaoTexto = municipio.variacao24h >= 0 
            ? `+${municipio.variacao24h.toFixed(2)}m`
            : `${municipio.variacao24h.toFixed(2)}m`;

        // Modifique esta parte da função carregarMunicipios no arquivo app.js
// Substitua o bloco de formatação de data atual por este:

// Format update time with hour and source
let atualizadoTexto;
if (municipio.atualizadoEm) {
    const dataAtualizacao = new Date(municipio.atualizadoEm);
    const hoje = new Date();
    const diffDias = Math.floor((hoje - dataAtualizacao) / (1000 * 60 * 60 * 24));
    
    // Formatar hora e minutos
    const horas = dataAtualizacao.getHours().toString().padStart(2, '0');
    const minutos = dataAtualizacao.getMinutes().toString().padStart(2, '0');
    const horaFormatada = `${horas}:${minutos}`;
    
    if (diffDias === 0) {
        atualizadoTexto = `Atualizado hoje às ${horaFormatada} | Fonte: Defesa Civil`;
    } else if (diffDias === 1) {
        atualizadoTexto = `Atualizado ontem às ${horaFormatada} | Fonte: Defesa Civil`;
    } else {
        atualizadoTexto = `Atualizado há ${diffDias} dias às ${horaFormatada} | Fonte: Defesa Civil`;
    }
} else {
    atualizadoTexto = 'Data não disponível';
}

        // Modificar a estrutura HTML do card na função carregarMunicipios
// Parte do HTML do card com a nova estrutura do cabeçalho:

// Create card HTML
const html = `
<div class="col-md-6 col-lg-4 mb-4">
    <div class="municipio-card" data-municipio-id="${id}" role="button" aria-label="Ver detalhes de ${municipio.nome}">
        <div class="card-header card-header-${municipio.risco}">
            <div class="location-container">
                <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                ${municipio.nome}
            </div>
            ${municipio.alertas && municipio.alertas.length > 0 
              ? '<div class="alert-bell-icon"><i class="fas fa-bell" aria-hidden="true"></i></div>' 
              : ''}
        </div>
        <div class="card-body">
            <div class="rio-info">
                <div class="rio-nome">Rio ${municipio.rio}</div>
                <div class="risco-badge ${riscoClasse}">Risco ${riscoTexto}</div>
            </div>
            <div class="nivel-valor">${municipio.nivelAtual.toFixed(2)}m</div>
            <div class="nivel-tendencia">
                <div class="tendencia ${tendenciaClasse}">
                    <i class="fas fa-${tendenciaIcone}" aria-hidden="true"></i> ${tendenciaTexto}
                </div>
                <div class="variacao">${variacaoTexto}</div>
            </div>
        </div>
        <div class="card-footer">
            <i class="far fa-clock" aria-hidden="true"></i> ${atualizadoTexto}
        </div>
    </div>
</div>
`;
        listaMunicipios.innerHTML += html;
    });

    // Adicionar eventos de clique aos cards
    document.querySelectorAll('.municipio-card').forEach(card => {
        card.addEventListener('click', () => {
            const municipioId = card.getAttribute('data-municipio-id');
            abrirModal(municipioId);
        });
    });
}

// Função para abrir o modal com detalhes do município
function abrirModal(municipioId) {
    const dadosSalvos = localStorage.getItem('dadosEnchentes');
    if (!dadosSalvos) {
        console.error('Nenhum dado encontrado no localStorage.');
        return;
    }

    const dados = JSON.parse(dadosSalvos);
    const municipio = dados.municipios[municipioId];
    if (!municipio) {
        console.error(`Município com ID ${municipioId} não encontrado.`);
        return;
    }

    // Preencher os dados do modal
    document.getElementById('municipioModalLabel').textContent = `Detalhes de ${municipio.nome}`;
    document.getElementById('modal-rio').textContent = municipio.rio;
    document.getElementById('modal-nivel').textContent = `${municipio.nivelAtual.toFixed(2)}m`;
    document.getElementById('modal-tendencia').innerHTML = `
        <span class="tendencia-${municipio.tendencia}">
            ${municipio.tendencia.charAt(0).toUpperCase() + municipio.tendencia.slice(1)}
        </span>`;
    document.getElementById('modal-status').innerHTML = `
        <span class="risco-${municipio.risco}">
            ${municipio.risco.charAt(0).toUpperCase() + municipio.risco.slice(1)}
        </span>`;
    document.getElementById('modal-atualizacao').textContent = formatarData(municipio.atualizadoEm);
    document.getElementById('modal-nivel-alerta').textContent = `${municipio.nivelAlerta.toFixed(2)}m`;
    document.getElementById('modal-nivel-inundacao').textContent = `${municipio.nivelInundacao.toFixed(2)}m`;
    document.getElementById('modal-defesa-civil').textContent = municipio.contatoDefesaCivil || 'Não disponível';
    document.getElementById('modal-bombeiros').textContent = municipio.contatoBombeiros || 'Não disponível';

    // Carregar alertas do município no modal
    carregarAlertasMunicipio(municipio);

    // Criar o gráfico de histórico
    const ctx = document.getElementById('historicoChart').getContext('2d');
    const { labels, niveis } = gerarDadosHistorico(municipio);

    if (historicoChart) {
        historicoChart.destroy();
    }

    historicoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nível do Rio (m)',
                    data: niveis,
                    borderColor: '#0088cc',
                    backgroundColor: 'rgba(0, 136, 204, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Nível de Alerta',
                    data: Array(labels.length).fill(municipio.nivelAlerta),
                    borderColor: 'rgba(255, 193, 7, 0.7)',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Nível de Inundação',
                    data: Array(labels.length).fill(municipio.nivelInundacao),
                    borderColor: 'rgba(220, 53, 69, 0.7)',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Nível (m)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Data/Hora'
                    }
                }
            }
        }
    });

    // Abrir o modal
    const modal = new bootstrap.Modal(document.getElementById('municipioModal'));
    modal.show();
}

// Função para formatar data
function formatarData(dataString) {
    if (!dataString) return 'Desconhecido';
    try {
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (erro) {
        console.warn('Erro ao formatar data:', erro);
        return 'Formato inválido';
    }
}

// Função para gerar dados de histórico de nível para o gráfico
function gerarDadosHistorico(municipio) {
    if (municipio.historico && Array.isArray(municipio.historico) && municipio.historico.length > 0) {
        const labels = municipio.historico.map(item => {
            const data = new Date(item.data);
            return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        });
        const niveis = municipio.historico.map(item => item.nivel);
        return { labels, niveis };
    }

    // Gerar dados simulados se não houver histórico
    const labels = [];
    const niveis = [];
    const horasRegistro = 24;
    const agora = new Date();
    const nivelAtual = municipio.nivelAtual || 10.0;

    for (let i = horasRegistro - 1; i >= 0; i--) {
        const dataHora = new Date(agora);
        dataHora.setHours(dataHora.getHours() - i);
        const dataFormatada = dataHora.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        labels.push(dataFormatada);

        let variacao;
        if (municipio.tendencia === 'subindo') {
            variacao = (i / horasRegistro) * -1.0;
        } else if (municipio.tendencia === 'descendo') {
            variacao = (i / horasRegistro) * 1.0;
        } else {
            variacao = (Math.random() - 0.5) * 0.2;
        }

        const oscilacao = (Math.random() - 0.5) * 0.1;
        const nivel = nivelAtual + variacao + oscilacao;
        niveis.push(Math.max(0, nivel));
    }

    return { labels, niveis };
}

// Função para carregar os alertas do município
function carregarAlertasMunicipio(municipio) {
    const container = document.getElementById('modal-alertas-container');
    if (!container) {
        console.error('Container de alertas não encontrado');
        return;
    }

    container.innerHTML = '';

    if (!municipio.alertas || municipio.alertas.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum alerta ativo para este município.</p>';
        return;
    }

    municipio.alertas.forEach(alerta => {
        const alertaClass = `alerta-${alerta.nivel}`;
        const badgeClass = `badge-alerta bg-${alerta.nivel === 'alto' ? 'danger' : alerta.nivel === 'medio' ? 'warning' : 'success'}`;
        const html = `
            <div class="card alerta-card ${alertaClass} mb-3">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-exclamation-triangle me-3" aria-hidden="true"></i>
                        <div>
                            <h6 class="mb-1">
                
                                <span class="${badgeClass}" style="!important;">${alerta.nivel.toUpperCase()}</span>
                            </h6>
                            <p class="mb-0">${alerta.descricao}</p>
                            <p class="mb-0"><strong>Instruções:</strong> ${alerta.instrucoes ? alerta.instrucoes.join('; ') : 'Nenhuma instrução disponível'}</p>
                            <p class="mb-0"><strong>Abrigos:</strong> ${alerta.abrigos ? alerta.abrigos.join(', ') : 'Nenhum abrigo disponível'}</p>
                            <small>Emitido em: ${formatarData(alerta.emitidoEm)}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Função para exibir alertas gerais (desativada)
function exibirAlertasGerais(alertas) {
    console.log('Exibição de alertas gerais desativada. Alertas estão disponíveis apenas nos modais.');
    // Não exibe nada no container de alertas gerais
}

// Função para atualizar data da última atualização
function atualizarDataUltimaAtualizacao(dataUltimaAtualizacao) {
    const elementoData = document.getElementById('ultima-atualizacao');
    if (!elementoData) {
        console.warn('Elemento de última atualização não encontrado');
        return;
    }

    elementoData.textContent = formatarData(dataUltimaAtualizacao);
}

// Função para carregar dados de exemplo (fallback)
function carregarDadosExemplo() {
    console.log('Criando dados de exemplo para desenvolvimento');

    const dataAtual = new Date().toISOString();
    return {
        "municipios": {
            "rio-branco": {
                "nome": "Rio Branco",
                "rio": "Acre",
                "nivelAtual": 15.17,
                "nivelAlerta": 13.5,
                "nivelInundacao": 14.5,
                "variacao24h": 0.21,
                "tendencia": "subindo",
                "risco": "alto",
                "atualizadoEm": dataAtual,
                "contatoDefesaCivil": "(68) 3223-1177",
                "contatoBombeiros": "193",
                "historico": [
                    { "data": new Date(Date.now() - 86400000).toISOString(), "nivel": 14.96 },
                    { "data": dataAtual, "nivel": 15.17 }
                ]
            },
            "cruzeiro-do-sul": {
                "nome": "Cruzeiro do Sul",
                "rio": "Juruá",
                "nivelAtual": 11.32,
                "nivelAlerta": 12.0,
                "nivelInundacao": 13.0,
                "variacao24h": 0.04,
                "tendencia": "estavel",
                "risco": "baixo",
                "atualizadoEm": dataAtual,
                "contatoDefesaCivil": "(68) 3322-1035",
                "contatoBombeiros": "193",
                "historico": [
                    { "data": new Date(Date.now() - 86400000).toISOString(), "nivel": 11.28 },
                    { "data": dataAtual, "nivel": 11.32 }
                ]
            }
        },
        "alertas": [
            {
                "municipioId": "rio-branco",
                "titulo": "ALERTA - Rio Branco",
                "nivel": "alto",
                "descricao": "Risco de inundação nas próximas 24h.",
                "emitidoEm": dataAtual
            }
        ],
        "ultimaAtualizacao": dataAtual
    };
}

// Função atualizada para corrigir contagem de alertas
function atualizarEstatisticas(dados) {
    if (!dados || !dados.municipios) return;

    let totalMunicipios = Object.keys(dados.municipios).length;
    let municipiosComAlertas = 0; // Contador para municípios com alertas
    let municipiosRiscoMedio = 0; // Contador para municípios com risco médio
    let municipiosRiscoAlto = 0;
    let municipiosBaixo = 0;

    // Contar municípios por categoria e alertas
    Object.values(dados.municipios).forEach(municipio => {
        // Contar por risco
        if (municipio.risco === 'alto') {
            municipiosRiscoAlto++;
        } else if (municipio.risco === 'medio') {
            municipiosRiscoMedio++;
        } else if (municipio.risco === 'baixo') {
            municipiosBaixo++;
        }
        
        // Contar municípios com alertas
        if (municipio.alertas && municipio.alertas.length > 0) {
            municipiosComAlertas++;
        }
    });

    // Atualizar valores nas estatísticas
    document.querySelector('.stats-card.primary .stat-value').textContent = totalMunicipios;
    
    // Mostrar municípios com risco médio no card amarelo
    document.querySelector('.stats-card.warning .stat-value').textContent = municipiosRiscoMedio;
    document.querySelector('.stats-card.warning .stat-label').textContent = 'Municípios em risco médio';
    
    document.querySelector('.stats-card.danger .stat-value').textContent = municipiosRiscoAlto;
    document.querySelector('.stats-card.success .stat-value').textContent = municipiosBaixo;

    // Atualizar o botão "Com alertas" com a contagem correta de alertas
    const btnComAlertas = document.querySelector('[data-filtro="com-alertas"]');
    if (btnComAlertas) {
        btnComAlertas.textContent = `Com Alertas ${municipiosComAlertas}`;
    }

    // Atualizar o badge do contador de alertas
    const contadorAlertas = document.querySelector('.alerta-contador');
    if (contadorAlertas) {
        contadorAlertas.textContent = municipiosComAlertas;
    }
}
