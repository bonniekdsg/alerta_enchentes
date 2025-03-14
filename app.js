document.addEventListener('DOMContentLoaded', function() {
  // Função para carregar dados com tratamento de erro melhorado
  function carregarDados() {
    // Primeiro, tente carregar usando o caminho relativo normal
    fetch('dados.json')
      .then(resposta => {
        if (!resposta.ok) {
          throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
        }
        return resposta.json();
      })
      .then(dados => {
        processarDadosCarregados(dados);
      })
      .catch(erro => {
        console.error('Erro ao carregar dados (tentativa 1):', erro);
        
        // Se falhar, tente carregar usando o caminho completo do GitHub
        const githubUser = 'bonniekdsg';
        const repo = 'alerta_enchentes';
        
        console.log('Tentando carregar dados do GitHub raw...');
        fetch(`https://raw.githubusercontent.com/${githubUser}/${repo}/main/dados.json`)
          .then(resposta => {
            if (!resposta.ok) {
              throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
            }
            return resposta.json();
          })
          .then(dados => {
            processarDadosCarregados(dados);
          })
          .catch(erro => {
            console.error('Erro ao carregar dados (tentativa 2):', erro);
            alert('Não foi possível carregar os dados. Por favor, tente novamente mais tarde.\n\nDetalhes do erro: ' + erro.message);
          });
      });
  }
  
  // Função para processar os dados após carregamento bem-sucedido
  function processarDadosCarregados(dados) {
    console.log('Dados carregados com sucesso!');
    
    // Atualizar a última atualização no cabeçalho
    document.getElementById('ultima-atualizacao').textContent = formatarData(dados.ultimaAtualizacao);
    
    // Calcular estatísticas para a dashboard
    atualizarEstatisticas(dados);
    
    // Processar alertas e associá-los aos municípios correspondentes
    processarAlertas(dados.alertas);
    
    // Atualizar ícones de alerta nos cards dos municípios
    if (typeof atualizarIconesAlerta === 'function') {
      atualizarIconesAlerta();
    }
    
    // Para cada município, atualizar o card correspondente
    for (const [municipioId, municipio] of Object.entries(dados.municipios)) {
      atualizarCardMunicipio(municipioId, municipio);
      
      // Atualizar o objeto dadosMunicipios com os novos dados do JSON
      if (typeof dadosMunicipios !== 'undefined' && dadosMunicipios[municipioId]) {
        // Preservar dados históricos e alertas que não estão no JSON
        const historicoNiveis = dadosMunicipios[municipioId].historicoNiveis;
        const alertasAntigos = dadosMunicipios[municipioId].alertas;
        
        // Atualizar dados básicos
        dadosMunicipios[municipioId].nome = municipio.nome;
        dadosMunicipios[municipioId].rio = `Rio ${municipio.rio}`;
        dadosMunicipios[municipioId].nivelAtual = municipio.nivelAtual;
        dadosMunicipios[municipioId].nivelAlerta = municipio.nivelAlerta;
        dadosMunicipios[municipioId].nivelInundacao = municipio.nivelInundacao;
        
        // Formatar variação para exibição
        dadosMunicipios[municipioId].variacao24h = municipio.variacao24h > 0 ? 
          `+${municipio.variacao24h}` : `${municipio.variacao24h}`;
        
        // Atualizar tendência
        dadosMunicipios[municipioId].tendencia = municipio.tendencia;
        
        // Atualizar status baseado no risco
        dadosMunicipios[municipioId].status = municipio.risco === 'alto' ? 'Crítico' : 
                                            municipio.risco === 'medio' ? 'Alerta' : 'Normal';
        
        // Atualizar classe CSS do status
        dadosMunicipios[municipioId].statusClass = municipio.risco === 'alto' ? 'bg-danger' : 
                                                municipio.risco === 'medio' ? 'bg-warning' : 'bg-success';
        
        // Atualizar tempo desde a última atualização
        dadosMunicipios[municipioId].atualizacao = calcularTempoPassado(municipio.atualizadoEm);
        
        // Atualizar contatos
        dadosMunicipios[municipioId].defesaCivil = municipio.contatoDefesaCivil;
        dadosMunicipios[municipioId].bombeiros = municipio.contatoBombeiros;
        
        // Gerar histórico com base no nível atual e variação
        const nivelAtual = municipio.nivelAtual;
        const variacao = municipio.variacao24h;
        const historicoGerado = [];
        
        // Gerar 7 pontos para as últimas 24h (dividido em 6 intervalos)
        for (let i = 6; i >= 0; i--) {
          // Quanto menor o i, mais próximo do nível atual
          const nivel = nivelAtual - (variacao * i / 6);
          historicoGerado.push(parseFloat(nivel.toFixed(2)));
        }
        
        // Atualizar o histórico com os dados gerados
        dadosMunicipios[municipioId].historicoNiveis = historicoGerado;
        
        console.log(`Dados do modal para ${municipioId} atualizados com sucesso.`);
        console.log(`Histórico gerado para ${municipioId}:`, historicoGerado);
      }
    }
  }
  
  // Iniciar o carregamento dos dados
  carregarDados();
});

function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleString('pt-BR');
}

function atualizarCardMunicipio(municipioId, municipio) {
  // Encontrar o card do município
  const card = document.querySelector(`.municipio-card[data-id="${municipioId}"]`);
  if (!card) return;
  
  // Atualizar os dados básicos
  card.querySelector('.card-header h5').textContent = municipio.nome;
  
  // Atualizar o risco
  const riscoElement = card.querySelector('.card-header span');
  riscoElement.className = `risco-${municipio.risco}`;
  riscoElement.textContent = municipio.risco === 'alto' ? 'Risco Alto' : 
                            municipio.risco === 'medio' ? 'Risco Médio' : 'Risco Baixo';
  
  // Atualizar informações do rio
  card.querySelector('.rio-info span').textContent = `Rio ${municipio.rio}`;
  
  // Atualizar nível atual
  card.querySelector('.nivel-info .fw-bold').nextSibling.textContent = ` ${municipio.nivelAtual}m`;
  
  // Atualizar tendência
  const tendenciaElement = card.querySelector('.nivel-info .tendencia-subindo, .nivel-info .tendencia-descendo');
  tendenciaElement.className = `tendencia-${municipio.tendencia}`;
  const tendenciaIcone = tendenciaElement.querySelector('i');
  tendenciaIcone.className = municipio.tendencia === 'subindo' ? 'fas fa-arrow-up me-1' : 'fas fa-arrow-down me-1';
  tendenciaElement.childNodes[1].textContent = ` ${municipio.variacao24h > 0 ? '+' : ''}${municipio.variacao24h}m (24h)`;
  
  // Atualizar gráfico de nível
  const nivelGrafico = card.querySelector('.nivel-grafico');
  nivelGrafico.className = `nivel-grafico nivel-${municipio.risco}`;
  
  // Calcular porcentagem do nível atual em relação ao nível de inundação
  const porcentagemNivel = (municipio.nivelAtual / municipio.nivelInundacao) * 100;
  nivelGrafico.querySelector('.nivel-atual').style.width = `${Math.min(porcentagemNivel, 100)}%`;
  
  // Atualizar marcadores de alerta e inundação
  const porcentagemAlerta = (municipio.nivelAlerta / municipio.nivelInundacao) * 100;
  const porcentagemInundacao = 100; // Sempre 100% pois é o máximo
  
  nivelGrafico.querySelector('.nivel-marker.nivel-alerta').style.left = `${porcentagemAlerta}%`;
  nivelGrafico.querySelector('.nivel-marker.nivel-inundacao').style.left = `${porcentagemInundacao}%`;
  
  // Atualizar legendas
  const legendas = card.querySelectorAll('.d-flex.justify-content-between.text-muted.small span');
  legendas[1].textContent = `Alerta: ${municipio.nivelAlerta}m`;
  legendas[2].textContent = `Inundação: ${municipio.nivelInundacao}m`;
  
  // Atualizar informação de atualização
  const atualizadoElement = card.querySelector('.mt-3 small');
  const tempoPassado = calcularTempoPassado(municipio.atualizadoEm);
  atualizadoElement.textContent = `Atualizado ${tempoPassado}`;
}

function calcularTempoPassado(dataISO) {
  const dataAtualizacao = new Date(dataISO);
  const agora = new Date();
  
  const diferencaMs = agora - dataAtualizacao;
  const diferencaMinutos = Math.floor(diferencaMs / (1000 * 60));
  
  if (diferencaMinutos < 1) return 'agora mesmo';
  if (diferencaMinutos < 60) return `há ${diferencaMinutos} minutos`;
  
  const diferencaHoras = Math.floor(diferencaMinutos / 60);
  if (diferencaHoras < 24) return `há ${diferencaHoras} horas`;
  
  const diferencaDias = Math.floor(diferencaHoras / 24);
  return `há ${diferencaDias} dias`;
}

// Função para filtrar municípios por risco
function filtrarMunicipios(filtro) {
  const municipios = document.querySelectorAll('#lista-municipios > div');
  
  municipios.forEach(municipio => {
    if (filtro === 'todos' || municipio.dataset.risco === filtro) {
      municipio.style.display = 'block';
    } else {
      municipio.style.display = 'none';
    }
  });
  
  // Atualizar botões de filtro
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    if (btn.dataset.filtro === filtro) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Função para buscar municípios
function buscarMunicipio(termo) {
  const municipios = document.querySelectorAll('#lista-municipios > div');
  const termoBusca = termo.toLowerCase().trim();
  
  municipios.forEach(municipio => {
    const nomeMunicipio = municipio.querySelector('.card-header h5').textContent.toLowerCase();
    if (termoBusca === '' || nomeMunicipio.includes(termoBusca)) {
      municipio.style.display = 'block';
    } else {
      municipio.style.display = 'none';
    }
  });
}

// Configurar eventos de filtro e busca
document.addEventListener('DOMContentLoaded', function() {
  // Configurar botões de filtro
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.addEventListener('click', function() {
      filtrarMunicipios(this.dataset.filtro);
    });
  });
  
  // Configurar campo de busca
  const campoBusca = document.getElementById('municipio-busca');
  if (campoBusca) {
    campoBusca.addEventListener('input', function() {
      buscarMunicipio(this.value);
    });
  }
});

// Função para atualizar as estatísticas na dashboard
function atualizarEstatisticas(dados) {
  // Contar municípios por categoria de risco
  let totalMunicipios = Object.keys(dados.municipios).length;
  let municipiosAlerta = 0;
  let municipiosRiscoAlto = 0;
  let municipiosNormais = 0;
  
  for (const municipio of Object.values(dados.municipios)) {
    if (municipio.risco === 'alto') {
      municipiosRiscoAlto++;
    } else if (municipio.risco === 'medio') {
      municipiosAlerta++;
    } else {
      municipiosNormais++;
    }
  }
  
  // Atualizar os valores nos cards de estatísticas
  const statMunicipios = document.querySelector('.stats-card.primary .stat-value');
  const statAlerta = document.querySelector('.stats-card.warning .stat-value');
  const statRiscoAlto = document.querySelector('.stats-card.danger .stat-value');
  const statNormais = document.querySelector('.stats-card.success .stat-value');
  
  if (statMunicipios) statMunicipios.textContent = totalMunicipios;
  if (statAlerta) statAlerta.textContent = municipiosAlerta;
  if (statRiscoAlto) statRiscoAlto.textContent = municipiosRiscoAlto;
  if (statNormais) statNormais.textContent = municipiosNormais;
}

// Função para processar alertas e associá-los aos municípios correspondentes
function processarAlertas(alertas) {
  if (!alertas || !Array.isArray(alertas) || typeof dadosMunicipios === 'undefined') return;
  
  console.log('Processando alertas:', alertas.length);
  
  // Primeiro, limpar todos os alertas existentes em cada município
  Object.keys(dadosMunicipios).forEach(municipioId => {
    dadosMunicipios[municipioId].alertas = [];
  });
  
  // Depois, associar cada alerta ao município correspondente
  alertas.forEach(alerta => {
    const municipioId = alerta.municipioId;
    
    if (dadosMunicipios[municipioId]) {
      console.log(`Adicionando alerta para ${municipioId}:`, alerta.titulo);
      
      // Adicionar o alerta ao array de alertas do município
      dadosMunicipios[municipioId].alertas.push({
        titulo: alerta.titulo,
        nivel: alerta.nivel,
        descricao: alerta.descricao,
        instrucoes: alerta.instrucoes,
        abrigos: alerta.abrigos || [],
        emitidoEm: alerta.emitidoEm
      });
    } else {
      console.warn(`Município ${municipioId} não encontrado para o alerta: ${alerta.titulo}`);
    }
  });
  
  // Registrar os municípios que têm alertas para depuração
  Object.keys(dadosMunicipios).forEach(municipioId => {
    if (dadosMunicipios[municipioId].alertas && dadosMunicipios[municipioId].alertas.length > 0) {
      console.log(`Município ${municipioId} tem ${dadosMunicipios[municipioId].alertas.length} alerta(s)`);
    }
  });
  
  // Atualizar o texto do botão Alertas no menu com o número total de alertas
  const totalAlertas = alertas.length;
  const menuAlertasLink = document.querySelector('a[href="#alertas"] .alerta-badge');
  if (menuAlertasLink && totalAlertas > 0) {
    menuAlertasLink.textContent = totalAlertas;
    menuAlertasLink.style.display = 'inline-block';
  } else if (menuAlertasLink) {
    menuAlertasLink.style.display = 'none';
  }
  
  // Atualizar o conteúdo da aba de alertas com uma mensagem informativa
  const alertasContainer = document.getElementById('alertas-container');
  if (alertasContainer) {
    alertasContainer.innerHTML = '';
    
    if (totalAlertas === 0) {
      alertasContainer.innerHTML = '<div class="alert alert-info">Não há alertas ativos no momento.</div>';
    } else {
      alertasContainer.innerHTML = `
        <div class="alert alert-info">
          <h5><i class="fas fa-info-circle me-2"></i> Informação</h5>
          <p>Há ${totalAlertas} alerta(s) ativo(s) no momento.</p>
          <p>Para visualizar os alertas detalhados de um município específico, clique no card do município na aba "Municípios".</p>
        </div>
      `;
    }
  }
}

// Esta função não é mais necessária da forma como estava, pois os alertas são processados pela função processarAlertas
// e exibidos apenas nos modais de cada município.
function carregarAlertas(alertas, municipioId = null) {
  // Se não for fornecido um municipioId, esta função não faz nada
  if (!municipioId) return;
  
  const alertasContainer = document.getElementById('modal-alertas-container');
  if (!alertasContainer) return;
  
  // Limpar alertas existentes
  alertasContainer.innerHTML = '';
  
  // Obter os alertas do município específico
  const municipio = dadosMunicipios[municipioId];
  if (!municipio || !municipio.alertas || municipio.alertas.length === 0) {
    alertasContainer.innerHTML = '<div class="alert alert-info mt-4">Não há alertas ativos para este município.</div>';
    return;
  }
  
  // Adicionar cabeçalho
  alertasContainer.innerHTML = '<h5 class="mt-4 mb-3">Alertas Ativos</h5>';
  
  // Adicionar cada alerta
  municipio.alertas.forEach(alerta => {
    const alertaElement = document.createElement('div');
    alertaElement.className = `card alerta-card alerta-${alerta.nivel} mb-4`;
    alertaElement.innerHTML = `
      <div class="card-header">
        <h5 class="mb-0">${alerta.titulo}</h5>
        <span class="badge-alerta bg-${alerta.nivel === 'alto' ? 'danger' : alerta.nivel === 'medio' ? 'warning' : 'success'}">
          ${alerta.nivel === 'alto' ? 'Crítico' : alerta.nivel === 'medio' ? 'Atenção' : 'Informativo'}
        </span>
      </div>
      <div class="card-body">
        <p>${alerta.descricao}</p>
        
        ${alerta.instrucoes && alerta.instrucoes.length > 0 ? `
          <h6 class="mt-3 mb-2">Instruções:</h6>
          <ul>
            ${alerta.instrucoes.map(instrucao => `<li>${instrucao}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${alerta.abrigos && alerta.abrigos.length > 0 ? `
          <h6 class="mt-3 mb-2">Abrigos disponíveis:</h6>
          <ul>
            ${alerta.abrigos.map(abrigo => `<li>${abrigo}</li>`).join('')}
          </ul>
        ` : ''}
        
        <div class="mt-3 text-muted small">
          Emitido em: ${formatarData(alerta.emitidoEm)}
        </div>
      </div>
    `;
    
    alertasContainer.appendChild(alertaElement);
  });
} 
