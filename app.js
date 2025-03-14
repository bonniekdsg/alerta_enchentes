document.addEventListener('DOMContentLoaded', function() {
  // Resumo das alterações para corrigir o filtro "Com Alertas":
  // 1. Criamos a função inicializarCardsMunicipios() para gerar os cards dinamicamente
  // 2. Modificamos a função processarDadosCarregados() para chamar inicializarCardsMunicipios()
  // 3. Melhoramos a função filtrarMunicipios() para detectar cards com diferentes seletores
  // 4. Adicionamos alertas de teste quando não há alertas para verificar o funcionamento
  // 5. Garantimos que os cards tenham os atributos data-id necessários para o filtro
  // 6. Implementamos logs detalhados para facilitar a depuração
  
  // Variável global para armazenar os dados atuais
  window.dadosAtuais = null;
  
  // Função para carregar dados com tratamento de erro melhorado e suporte a localStorage
  function carregarDados(ignorarCache = false) {
    console.log('Carregando dados' + (ignorarCache ? ' (ignorando cache)' : '') + '...');
    
    // Tentar carregar dados do localStorage primeiro
    const dadosSalvos = localStorage.getItem('dadosEnchentes');
    const ultimaAtualizacao = localStorage.getItem('ultimaAtualizacao');
    
    if (dadosSalvos && !ignorarCache) {
      try {
        window.dadosAtuais = JSON.parse(dadosSalvos);
        console.log('Dados carregados do localStorage:', ultimaAtualizacao);
        processarDadosCarregados(window.dadosAtuais);
        
        // Mesmo carregando do localStorage, verificamos se há atualizações no servidor
        verificarAtualizacoesServidor();
        return;
      } catch (erro) {
        console.error('Erro ao carregar dados do localStorage:', erro);
        // Se houver erro, continuamos para carregar do servidor
      }
    }
    
    // Adicionar parâmetro de timestamp para evitar cache se necessário
    const timestamp = new Date().getTime();
    const urlParams = ignorarCache ? `?_=${timestamp}` : '';
    
    // Primeiro, tente carregar usando o caminho relativo normal
    fetch('dados.json' + urlParams, {
      cache: ignorarCache ? 'no-store' : 'default'
    })
      .then(resposta => {
        if (!resposta.ok) {
          throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
        }
        return resposta.json();
      })
      .then(dados => {
        // Verificar se os dados realmente mudaram antes de processar
        if (!window.dadosAtuais || JSON.stringify(dados) !== JSON.stringify(window.dadosAtuais)) {
          // Salvar no localStorage
          localStorage.setItem('dadosEnchentes', JSON.stringify(dados));
          localStorage.setItem('ultimaAtualizacao', dados.ultimaAtualizacao);
          
          window.dadosAtuais = dados;
          console.log('Dados carregados do servidor e salvos no localStorage.');
          processarDadosCarregados(dados);
        } else {
          console.log('Dados do servidor são idênticos aos já carregados.');
        }
      })
      .catch(erro => {
        console.error('Erro ao carregar dados (tentativa 1):', erro);
        
        // Se falhar, tente carregar usando o caminho completo do GitHub
        const githubUser = 'bonniekdsg';
        const repo = 'alerta_enchentes';
        
        console.log('Tentando carregar dados do GitHub raw...');
        fetch(`https://raw.githubusercontent.com/${githubUser}/${repo}/main/dados.json${urlParams}`, {
          cache: ignorarCache ? 'no-store' : 'default'
        })
          .then(resposta => {
            if (!resposta.ok) {
              throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
            }
            return resposta.json();
          })
          .then(dados => {
            // Verificar se os dados realmente mudaram antes de processar
            if (!window.dadosAtuais || JSON.stringify(dados) !== JSON.stringify(window.dadosAtuais)) {
              // Salvar no localStorage
              localStorage.setItem('dadosEnchentes', JSON.stringify(dados));
              localStorage.setItem('ultimaAtualizacao', dados.ultimaAtualizacao);
              
              window.dadosAtuais = dados;
              console.log('Dados carregados do GitHub e salvos no localStorage.');
              processarDadosCarregados(dados);
            } else {
              console.log('Dados do GitHub são idênticos aos já carregados.');
            }
          })
          .catch(erro => {
            console.error('Erro ao carregar dados (tentativa 2):', erro);
            
            // Se ainda temos dados no localStorage, usamos eles mesmo que antigos
            if (window.dadosAtuais) {
              console.log('Usando dados em cache do localStorage devido a falha na conexão.');
            } else {
              alert('Não foi possível carregar os dados. Por favor, tente novamente mais tarde.\n\nDetalhes do erro: ' + erro.message);
            }
          });
      });
  }
  
  // Função para verificar atualizações no servidor sem reprocessar dados
  function verificarAtualizacoesServidor() {
    console.log('Verificando atualizações no servidor...');
    
    const timestamp = new Date().getTime();
    
    // Primeiro tenta o arquivo local
    fetch('dados.json?_=' + timestamp, { 
      method: 'HEAD',
      cache: 'no-store' 
    })
      .then(resposta => {
        if (resposta.ok) {
          const ultimaModificacao = resposta.headers.get('last-modified');
          const ultimaModificacaoConhecida = localStorage.getItem('ultimaModificacaoLocal');
          
          if (ultimaModificacao && ultimaModificacao !== ultimaModificacaoConhecida) {
            console.log('Atualização detectada no servidor. Recarregando dados...');
            localStorage.setItem('ultimaModificacaoLocal', ultimaModificacao);
            carregarDados(true);
            mostrarNotificacaoAtualizacao('local');
          } else {
            console.log('Nenhuma atualização detectada no servidor.');
          }
        } else {
          // Se falhar, tenta verificar no GitHub
          verificarAtualizacoesGitHub();
        }
      })
      .catch(erro => {
        console.log('Erro ao verificar atualizações no servidor:', erro);
        verificarAtualizacoesGitHub();
      });
  }
  
  // Função para verificar atualizações no GitHub
  function verificarAtualizacoesGitHub() {
    const githubUser = 'bonniekdsg';
    const repo = 'alerta_enchentes';
    const url = `https://api.github.com/repos/${githubUser}/${repo}/contents/dados.json`;
    
    fetch(url)
      .then(resposta => {
        if (!resposta.ok) {
          throw new Error(`Erro ao verificar atualizações: ${resposta.status}`);
        }
        return resposta.json();
      })
      .then(dados => {
        const sha = dados.sha;
        const shaAnterior = localStorage.getItem('dadosSHA');
        
        if (sha && sha !== shaAnterior) {
          console.log('Atualização detectada no GitHub. Recarregando dados...');
          localStorage.setItem('dadosSHA', sha);
          carregarDados(true);
          mostrarNotificacaoAtualizacao('github');
        } else {
          console.log('Nenhuma atualização detectada no GitHub.');
        }
      })
      .catch(erro => {
        console.error('Erro ao verificar atualizações no GitHub:', erro);
      });
  }
  
  // Função para mostrar notificação de atualização
  function mostrarNotificacaoAtualizacao(fonte) {
    console.log(`Mostrando notificação de atualização (fonte: ${fonte})`);
    
    const alertContainer = document.createElement('div');
    alertContainer.className = 'alert alert-info alert-dismissible fade show';
    alertContainer.setAttribute('role', 'alert');
    alertContainer.innerHTML = `
      <strong>Atualização!</strong> Novos dados foram carregados automaticamente ${fonte === 'github' ? 'do GitHub' : ''}.
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adicionar alerta ao topo da página
    const mainContainer = document.querySelector('main.container');
    if (mainContainer && mainContainer.firstChild) {
      mainContainer.insertBefore(alertContainer, mainContainer.firstChild);
    } else {
      document.body.insertBefore(alertContainer, document.body.firstChild);
    }
    
    // Remover o alerta após 5 segundos
    setTimeout(() => {
      alertContainer.classList.remove('show');
      setTimeout(() => alertContainer.remove(), 500);
    }, 5000);
  }
  
  // Função para processar os dados após carregamento bem-sucedido
  function processarDadosCarregados(dados) {
    console.log('Dados carregados com sucesso!');
    
    // Atualizar a última atualização no cabeçalho
    document.getElementById('ultima-atualizacao').textContent = formatarData(dados.ultimaAtualizacao);
    
    // Armazenar a data da última atualização no localStorage
    localStorage.setItem('ultimaAtualizacao', dados.ultimaAtualizacao);
    
    // Calcular estatísticas para a dashboard
    atualizarEstatisticas(dados);
    
    // Processar alertas e associá-los aos municípios correspondentes
    processarAlertas(dados.alertas);
    
    // Atualizar ícones de alerta nos cards dos municípios
    if (typeof atualizarIconesAlerta === 'function') {
      atualizarIconesAlerta();
    }
    
    // Para cada município, atualizar o objeto dadosMunicipios com os novos dados do JSON
    for (const [municipioId, municipio] of Object.entries(dados.municipios)) {
      // Verificar se o município já existe no objeto dadosMunicipios
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
    
    // Inicializar os cards dos municípios
    inicializarCardsMunicipios();
  }
  
  // Função para atualizar dados automaticamente
  function atualizarDadosAutomaticamente() {
    console.log('Executando atualização automática...');
    verificarAtualizacoesServidor();
  }
  
  // Iniciar o carregamento dos dados
  carregarDados();
  
  // Configurar atualização automática a cada 5 minutos (300000 ms)
  const intervaloAtualizacao = 5 * 60 * 1000;
  console.log(`Configurando atualização automática a cada ${intervaloAtualizacao/60000} minutos`);
  setInterval(atualizarDadosAutomaticamente, intervaloAtualizacao);
});

function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleString('pt-BR');
}

function atualizarCardMunicipio(municipioId, municipio) {
  try {
    // Encontrar o card do município
    const card = document.querySelector(`.municipio-card[data-id="${municipioId}"]`);
    if (!card) {
      console.log(`Card para município ${municipioId} não encontrado no DOM.`);
      return;
    }
    
    // Atualizar os dados básicos
    const tituloElement = card.querySelector('.card-header h5');
    if (tituloElement) {
      tituloElement.textContent = municipio.nome;
    }
    
    // Atualizar o risco
    const riscoElement = card.querySelector('.card-header span');
    if (riscoElement) {
      riscoElement.className = `risco-${municipio.risco}`;
      riscoElement.textContent = municipio.risco === 'alto' ? 'Risco Alto' : 
                                municipio.risco === 'medio' ? 'Risco Médio' : 'Risco Baixo';
    }
    
    // Atualizar informações do rio
    const rioInfoElement = card.querySelector('.rio-info span');
    if (rioInfoElement) {
      rioInfoElement.textContent = `Rio ${municipio.rio}`;
    }
    
    // Atualizar nível atual
    const nivelElement = card.querySelector('.nivel-info .fw-bold');
    if (nivelElement && nivelElement.nextSibling) {
      nivelElement.nextSibling.textContent = ` ${municipio.nivelAtual}m`;
    }
    
    // Atualizar tendência
    const tendenciaElement = card.querySelector('.nivel-info .tendencia-subindo, .nivel-info .tendencia-descendo');
    if (tendenciaElement) {
      tendenciaElement.className = `tendencia-${municipio.tendencia}`;
      
      const tendenciaIcone = tendenciaElement.querySelector('i');
      if (tendenciaIcone) {
        tendenciaIcone.className = municipio.tendencia === 'subindo' ? 'fas fa-arrow-up me-1' : 'fas fa-arrow-down me-1';
      }
      
      if (tendenciaElement.childNodes.length > 1) {
        tendenciaElement.childNodes[1].textContent = ` ${municipio.variacao24h > 0 ? '+' : ''}${municipio.variacao24h}m (24h)`;
      }
    }
    
    // Atualizar gráfico de nível
    const nivelGrafico = card.querySelector('.nivel-grafico');
    if (nivelGrafico) {
      nivelGrafico.className = `nivel-grafico nivel-${municipio.risco}`;
      
      // Calcular porcentagem do nível atual em relação ao nível de inundação
      const porcentagemNivel = (municipio.nivelAtual / municipio.nivelInundacao) * 100;
      
      const nivelAtualElement = nivelGrafico.querySelector('.nivel-atual');
      if (nivelAtualElement) {
        nivelAtualElement.style.width = `${Math.min(porcentagemNivel, 100)}%`;
      }
      
      // Atualizar marcadores de alerta e inundação
      const porcentagemAlerta = (municipio.nivelAlerta / municipio.nivelInundacao) * 100;
      const porcentagemInundacao = 100; // Sempre 100% pois é o máximo
      
      const alertaMarker = nivelGrafico.querySelector('.nivel-marker.nivel-alerta');
      if (alertaMarker) {
        alertaMarker.style.left = `${porcentagemAlerta}%`;
      }
      
      const inundacaoMarker = nivelGrafico.querySelector('.nivel-marker.nivel-inundacao');
      if (inundacaoMarker) {
        inundacaoMarker.style.left = `${porcentagemInundacao}%`;
      }
    }
    
    // Atualizar legendas
    const legendas = card.querySelectorAll('.d-flex.justify-content-between.text-muted.small span');
    if (legendas && legendas.length > 2) {
      legendas[1].textContent = `Alerta: ${municipio.nivelAlerta}m`;
      legendas[2].textContent = `Inundação: ${municipio.nivelInundacao}m`;
    }
    
    // Atualizar informação de atualização
    const atualizadoElement = card.querySelector('.mt-3 small');
    if (atualizadoElement) {
      const tempoPassado = calcularTempoPassado(municipio.atualizadoEm);
      atualizadoElement.textContent = `Atualizado ${tempoPassado}`;
    }
    
    console.log(`Card para município ${municipioId} atualizado com sucesso.`);
  } catch (erro) {
    console.error(`Erro ao atualizar card para município ${municipioId}:`, erro);
  }
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

// Função para filtrar municípios por status ou alertas
function filtrarMunicipios(filtro) {
  console.log(`Aplicando filtro: ${filtro}`);
  
  // Verificar se dadosMunicipios está definido
  if (typeof dadosMunicipios === 'undefined' || !dadosMunicipios) {
    console.error('Objeto dadosMunicipios não está definido. Não é possível filtrar municípios.');
    return;
  }
  
  // Atualizar botões de filtro
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.btn-filtro[data-filtro="${filtro}"]`).classList.add('active');
  
  // Verificar se há municípios com alertas para logging
  if (filtro === 'com-alertas') {
    let municipiosComAlertas = [];
    Object.keys(dadosMunicipios).forEach(id => {
      if (dadosMunicipios[id].alertas && dadosMunicipios[id].alertas.length > 0) {
        municipiosComAlertas.push(id);
      }
    });
    console.log(`Municípios com alertas: ${municipiosComAlertas.join(', ')} (total: ${municipiosComAlertas.length})`);
  }
  
  // Obter todos os cards de municípios
  // Primeiro, tente com a classe card-municipio
  let cards = document.querySelectorAll('.card-municipio');
  
  // Se não encontrar, tente com a classe municipio-card
  if (cards.length === 0) {
    cards = document.querySelectorAll('.municipio-card');
    console.log(`Usando seletor .municipio-card (encontrados: ${cards.length})`);
  }
  
  // Se ainda não encontrar, tente com o seletor genérico para cards dentro do container
  if (cards.length === 0) {
    cards = document.querySelectorAll('#lista-municipios > div > .card');
    console.log(`Usando seletor #lista-municipios > div > .card (encontrados: ${cards.length})`);
  }
  
  // Se ainda não encontrar, tente com o seletor mais genérico
  if (cards.length === 0) {
    cards = document.querySelectorAll('#lista-municipios > div');
    console.log(`Usando seletor #lista-municipios > div (encontrados: ${cards.length})`);
  }
  
  console.log(`Total de cards encontrados: ${cards.length}`);
  let visibleCount = 0;
  
  // Aplicar filtro a cada card
  cards.forEach(card => {
    // Tentar obter o ID do município de diferentes atributos
    let municipioId = card.getAttribute('data-municipio-id') || 
                     card.getAttribute('data-id') || 
                     card.getAttribute('data-municipio');
    
    // Se não encontrar o ID diretamente, tentar encontrar em um elemento filho
    if (!municipioId && card.querySelector('[data-id]')) {
      municipioId = card.querySelector('[data-id]').getAttribute('data-id');
    }
    
    // Se ainda não encontrar, tentar extrair do onclick
    if (!municipioId && card.getAttribute('onclick')) {
      const onclickAttr = card.getAttribute('onclick');
      const match = onclickAttr.match(/abrirModal\(['"]([^'"]+)['"]\)/);
      if (match && match[1]) {
        municipioId = match[1];
      }
    }
    
    console.log(`Card: ${card.className}, ID: ${municipioId || 'não encontrado'}`);
    
    let visible = true;
    
    if (filtro === 'todos') {
      visible = true;
    } else if (filtro === 'com-alertas') {
      try {
        if (municipioId && dadosMunicipios[municipioId] && 
            dadosMunicipios[municipioId].alertas && 
            dadosMunicipios[municipioId].alertas.length > 0) {
          visible = true;
          console.log(`Município ${municipioId} tem ${dadosMunicipios[municipioId].alertas.length} alerta(s) - será exibido`);
        } else {
          visible = false;
          console.log(`Município ${municipioId || 'desconhecido'} não tem alertas ou ID não encontrado - será ocultado`);
        }
      } catch (erro) {
        console.error(`Erro ao verificar alertas para ${municipioId || 'desconhecido'}:`, erro);
        visible = false;
      }
    } else if (['alto', 'medio', 'baixo'].includes(filtro)) {
      // Tentar obter o risco de diferentes atributos
      let risco = null;
      
      // Primeiro, verificar no container pai (que tem o atributo data-risco)
      const container = card.closest('[data-risco]');
      if (container) {
        risco = container.getAttribute('data-risco');
      }
      
      // Se não encontrar no container, verificar no próprio card
      if (!risco) {
        risco = card.getAttribute('data-risco');
      }
      
      // Se não encontrar no card, verificar em elementos filhos
      if (!risco && card.querySelector('[data-risco]')) {
        risco = card.querySelector('[data-risco]').getAttribute('data-risco');
      }
      
      // Se ainda não encontrou, mas temos o ID do município, usar o risco do dadosMunicipios
      if (!risco && municipioId && dadosMunicipios[municipioId]) {
        if (dadosMunicipios[municipioId].risco) {
          risco = dadosMunicipios[municipioId].risco;
        } else if (dadosMunicipios[municipioId].status) {
          const status = dadosMunicipios[municipioId].status.toLowerCase();
          if (status === 'crítico' || status === 'critico') {
            risco = 'alto';
          } else if (status === 'alerta') {
            risco = 'medio';
          } else {
            risco = 'baixo';
          }
        }
      }
      
      console.log(`Município ${municipioId || 'desconhecido'}, risco: ${risco || 'não encontrado'}, filtro: ${filtro}`);
      
      if (risco) {
        visible = risco === filtro;
      } else {
        visible = false;
      }
    }
    
    // Atualizar visibilidade do card
    // Se o card estiver dentro de um container, atualizar o container
    const container = card.closest('#lista-municipios > div');
    const elementToUpdate = container || card;
    
    if (visible) {
      elementToUpdate.style.display = '';
      visibleCount++;
    } else {
      elementToUpdate.style.display = 'none';
    }
  });
  
  // Mostrar mensagem se nenhum município for encontrado
  const mensagemSemResultados = document.getElementById('mensagem-sem-resultados');
  if (mensagemSemResultados) {
    if (visibleCount === 0) {
      mensagemSemResultados.style.display = 'block';
      mensagemSemResultados.innerHTML = `<div class="alert alert-info">Nenhum município encontrado para o filtro "${filtro}".</div>`;
    } else {
      mensagemSemResultados.style.display = 'none';
    }
  }
  
  console.log(`Filtro "${filtro}" aplicado. ${visibleCount} municípios visíveis.`);
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

// Função para forçar a atualização dos dados
function forcarAtualizacao() {
  console.log('Forçando atualização dos dados...');
  
  // Limpar cache do navegador
  limparCache().then(() => {
    // Recarregar os dados com a opção de ignorar cache
    carregarDados(true);
    
    // Mostrar mensagem de sucesso
    const alertContainer = document.createElement('div');
    alertContainer.className = 'alert alert-success alert-dismissible fade show';
    alertContainer.setAttribute('role', 'alert');
    alertContainer.innerHTML = `
      <strong>Sucesso!</strong> Solicitação de atualização enviada.
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adicionar alerta ao topo da página
    const mainContainer = document.querySelector('main.container');
    if (mainContainer && mainContainer.firstChild) {
      mainContainer.insertBefore(alertContainer, mainContainer.firstChild);
    } else {
      document.body.insertBefore(alertContainer, document.body.firstChild);
    }
    
    // Remover o alerta após 5 segundos
    setTimeout(() => {
      alertContainer.classList.remove('show');
      setTimeout(() => alertContainer.remove(), 500);
    }, 5000);
  });
}

// Função para limpar o cache do navegador
async function limparCache() {
  console.log('Limpando cache do navegador...');
  
  // Limpar cache da API Fetch
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Cache limpo com sucesso');
    } catch (erro) {
      console.error('Erro ao limpar cache:', erro);
    }
  }
  
  // Tentar limpar cache específico para o arquivo dados.json
  try {
    const cache = await caches.open('v1');
    await cache.delete('dados.json');
    await cache.delete('https://raw.githubusercontent.com/bonniekdsg/alerta_enchentes/main/dados.json');
    console.log('Cache específico de dados.json limpo');
  } catch (erro) {
    console.error('Erro ao limpar cache específico:', erro);
  }
  
  return Promise.resolve();
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
  
  // Configurar botão de atualização no menu
  const btnAtualizar = document.getElementById('btn-atualizar');
  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', function(e) {
      e.preventDefault();
      forcarAtualizacao();
    });
  }
  
  // Configurar botão de modo noturno
  const btnModoNoturno = document.getElementById('toggle-dark-mode');
  if (btnModoNoturno) {
    btnModoNoturno.addEventListener('click', function(e) {
      e.preventDefault();
      alternarModoNoturno();
    });
  }
  
  // Carregar preferência de tema salva
  if (localStorage.getItem('modoNoturno') === 'ativado') {
    document.body.classList.add('dark-mode');
  }
});

// Função para alternar o modo noturno
function alternarModoNoturno() {
  document.body.classList.toggle('dark-mode');
  
  // Salvar preferência no localStorage
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('modoNoturno', 'ativado');
  } else {
    localStorage.removeItem('modoNoturno');
  }
}

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
  try {
    if (!alertas || !Array.isArray(alertas)) {
      console.log('Nenhum alerta para processar ou formato inválido.');
      return;
    }
    
    // Verificar se dadosMunicipios está definido
    if (typeof dadosMunicipios === 'undefined') {
      console.error('Objeto dadosMunicipios não está definido. Não é possível processar alertas.');
      return;
    }
    
    console.log('Processando alertas:', alertas.length);
    
    // Primeiro, limpar todos os alertas existentes em cada município
    Object.keys(dadosMunicipios).forEach(municipioId => {
      // Inicializar o array de alertas se não existir
      if (!dadosMunicipios[municipioId].alertas) {
        dadosMunicipios[municipioId].alertas = [];
      } else {
        // Limpar alertas existentes
        dadosMunicipios[municipioId].alertas = [];
      }
    });
    
    // Depois, associar cada alerta ao município correspondente
    alertas.forEach(alerta => {
      if (!alerta || !alerta.municipioId) {
        console.warn('Alerta inválido ou sem municipioId:', alerta);
        return;
      }
      
      const municipioId = alerta.municipioId;
      
      if (dadosMunicipios[municipioId]) {
        console.log(`Adicionando alerta para ${municipioId}:`, alerta.titulo);
        
        // Adicionar o alerta ao array de alertas do município
        dadosMunicipios[municipioId].alertas.push({
          titulo: alerta.titulo || 'Alerta sem título',
          nivel: alerta.nivel || 'medio',
          descricao: alerta.descricao || 'Sem descrição disponível',
          instrucoes: alerta.instrucoes || [],
          abrigos: alerta.abrigos || [],
          emitidoEm: alerta.emitidoEm || new Date().toISOString()
        });
      } else {
        console.warn(`Município ${municipioId} não encontrado para o alerta: ${alerta.titulo}`);
      }
    });
    
    // Contar municípios com alertas
    let municipiosComAlertas = 0;
    let municipiosComAlertasIds = [];
    
    Object.keys(dadosMunicipios).forEach(municipioId => {
      if (dadosMunicipios[municipioId].alertas && dadosMunicipios[municipioId].alertas.length > 0) {
        municipiosComAlertas++;
        municipiosComAlertasIds.push(municipioId);
        console.log(`Município ${municipioId} tem ${dadosMunicipios[municipioId].alertas.length} alerta(s)`);
      }
    });
    
    console.log(`Total de municípios com alertas: ${municipiosComAlertas}`);
    console.log('IDs dos municípios com alertas:', municipiosComAlertasIds);
    
    // Atualizar o contador de alertas no botão de filtro
    const contadorAlertas = document.querySelector('.alerta-contador');
    if (contadorAlertas) {
      contadorAlertas.textContent = municipiosComAlertas;
      contadorAlertas.style.display = municipiosComAlertas > 0 ? 'inline-block' : 'none';
    }
    
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
            <p>Há ${totalAlertas} alerta(s) ativo(s) em ${municipiosComAlertas} município(s).</p>
            <p>Para visualizar os alertas detalhados de um município específico, clique no card do município na aba "Municípios".</p>
          </div>
        `;
      }
    }
    
    // Atualizar indicadores de alerta nos cards
    atualizarIndicadoresAlerta();
    
    // Se o filtro atual for "com-alertas", reaplicar o filtro para atualizar a visualização
    const filtroAtivo = document.querySelector('.btn-filtro.active');
    if (filtroAtivo && filtroAtivo.dataset.filtro === 'com-alertas') {
      console.log('Reaplicando filtro "Com Alertas" após processamento de alertas');
      filtrarMunicipios('com-alertas');
    }
  } catch (erro) {
    console.error('Erro ao processar alertas:', erro);
  }
}

// Função para atualizar os indicadores de alerta nos cards
function atualizarIndicadoresAlerta() {
  console.log('Atualizando indicadores de alerta nos cards...');
  
  // Remover todos os indicadores existentes
  document.querySelectorAll('.alerta-indicador').forEach(indicador => {
    indicador.remove();
  });
  
  // Verificar se dadosMunicipios está definido
  if (typeof dadosMunicipios === 'undefined') {
    console.error('Objeto dadosMunicipios não está definido.');
    return;
  }
  
  // Para cada município, verificar se tem alertas e adicionar o indicador
  Object.keys(dadosMunicipios).forEach(municipioId => {
    if (dadosMunicipios[municipioId].alertas && dadosMunicipios[municipioId].alertas.length > 0) {
      const card = document.querySelector(`.municipio-card[data-id="${municipioId}"]`);
      if (card) {
        // Criar o indicador de alerta
        const indicador = document.createElement('div');
        indicador.className = 'alerta-indicador';
        indicador.title = `${dadosMunicipios[municipioId].alertas.length} alerta(s) ativo(s)`;
        
        // Adicionar o indicador ao card
        card.style.position = 'relative';
        card.appendChild(indicador);
      }
    }
  });
  
  console.log('Indicadores de alerta atualizados com sucesso!');
}

// Função para carregar alertas no modal de um município específico
function carregarAlertas(alertas, municipioId = null) {
  try {
    // Se não for fornecido um municipioId, esta função não faz nada
    if (!municipioId) {
      console.log('Nenhum municipioId fornecido para carregarAlertas');
      return;
    }
    
    const alertasContainer = document.getElementById('modal-alertas-container');
    if (!alertasContainer) {
      console.error('Container de alertas não encontrado no DOM');
      return;
    }
    
    // Limpar alertas existentes
    alertasContainer.innerHTML = '';
    
    // Verificar se dadosMunicipios está definido
    if (typeof dadosMunicipios === 'undefined') {
      console.error('Objeto dadosMunicipios não está definido');
      alertasContainer.innerHTML = '<div class="alert alert-danger mt-4">Erro ao carregar alertas: dados não disponíveis</div>';
      return;
    }
    
    // Obter os alertas do município específico
    const municipio = dadosMunicipios[municipioId];
    if (!municipio) {
      console.error(`Município ${municipioId} não encontrado em dadosMunicipios`);
      alertasContainer.innerHTML = '<div class="alert alert-danger mt-4">Erro ao carregar alertas: município não encontrado</div>';
      return;
    }
    
    if (!municipio.alertas || municipio.alertas.length === 0) {
      alertasContainer.innerHTML = '<div class="alert alert-info mt-4">Não há alertas ativos para este município.</div>';
      return;
    }
    
    // Adicionar cabeçalho
    alertasContainer.innerHTML = '<h5 class="mt-4 mb-3">Alertas Ativos</h5>';
    
    // Adicionar cada alerta
    municipio.alertas.forEach(alerta => {
      if (!alerta) return;
      
      const alertaElement = document.createElement('div');
      alertaElement.className = `card alerta-card alerta-${alerta.nivel || 'medio'} mb-4`;
      
      const titulo = alerta.titulo || 'Alerta sem título';
      const nivel = alerta.nivel || 'medio';
      const descricao = alerta.descricao || 'Sem descrição disponível';
      const instrucoes = alerta.instrucoes || [];
      const abrigos = alerta.abrigos || [];
      const emitidoEm = alerta.emitidoEm || new Date().toISOString();
      
      alertaElement.innerHTML = `
        <div class="card-header">
          <h5 class="mb-0">${titulo}</h5>
          <span class="badge-alerta bg-${nivel === 'alto' ? 'danger' : nivel === 'medio' ? 'warning' : 'success'}">
            ${nivel === 'alto' ? 'Crítico' : nivel === 'medio' ? 'Atenção' : 'Informativo'}
          </span>
        </div>
        <div class="card-body">
          <p>${descricao}</p>
          
          ${instrucoes && instrucoes.length > 0 ? `
            <h6 class="mt-3 mb-2">Instruções:</h6>
            <ul>
              ${instrucoes.map(instrucao => `<li>${instrucao}</li>`).join('')}
            </ul>
          ` : ''}
          
          ${abrigos && abrigos.length > 0 ? `
            <h6 class="mt-3 mb-2">Abrigos disponíveis:</h6>
            <ul>
              ${abrigos.map(abrigo => `<li>${abrigo}</li>`).join('')}
            </ul>
          ` : ''}
          
          <div class="mt-3 text-muted small">
            Emitido em: ${formatarData(emitidoEm)}
          </div>
        </div>
      `;
      
      alertasContainer.appendChild(alertaElement);
    });
    
    console.log(`Alertas carregados com sucesso para ${municipioId}`);
  } catch (erro) {
    console.error(`Erro ao carregar alertas para município ${municipioId}:`, erro);
    
    const alertasContainer = document.getElementById('modal-alertas-container');
    if (alertasContainer) {
      alertasContainer.innerHTML = `<div class="alert alert-danger mt-4">Erro ao carregar alertas: ${erro.message}</div>`;
    }
  }
}

// Função para ordenar os cards dos municípios por nível de risco
function ordenarCardsPorRisco() {
  const container = document.getElementById('lista-municipios');
  if (!container) return;
  
  console.log('Ordenando cards por nível de risco...');
  
  // Obter todos os cards
  const cards = Array.from(container.children);
  
  // Definir a ordem de prioridade dos riscos
  const ordemRisco = {
    'alto': 1,
    'medio': 2,
    'baixo': 3
  };
  
  // Ordenar os cards por nível de risco
  cards.sort((a, b) => {
    const riscoA = a.getAttribute('data-risco');
    const riscoB = b.getAttribute('data-risco');
    
    // Comparar pela ordem de prioridade
    return ordemRisco[riscoA] - ordemRisco[riscoB];
  });
  
  // Remover todos os cards do container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  // Adicionar os cards ordenados de volta ao container
  cards.forEach(card => {
    container.appendChild(card);
  });
  
  console.log('Cards ordenados com sucesso!');
}

// Função para inicializar os cards dos municípios
function inicializarCardsMunicipios() {
  console.log('Inicializando cards dos municípios...');
  
  // Verificar se dadosMunicipios está definido
  if (typeof dadosMunicipios === 'undefined' || !dadosMunicipios) {
    console.error('Objeto dadosMunicipios não está definido. Não é possível inicializar cards.');
    return;
  }
  
  // Obter o container dos municípios
  const container = document.getElementById('lista-municipios');
  if (!container) {
    console.error('Container lista-municipios não encontrado no DOM.');
    return;
  }
  
  // Limpar o container
  container.innerHTML = '';
  
  // Para cada município, criar um card
  for (const [municipioId, municipio] of Object.entries(dadosMunicipios)) {
    // Determinar o risco com base no status
    let risco = 'baixo';
    if (municipio.status === 'Crítico' || municipio.status.toLowerCase() === 'critico') {
      risco = 'alto';
    } else if (municipio.status === 'Alerta' || municipio.status.toLowerCase() === 'alerta') {
      risco = 'medio';
    }
    
    // Criar o elemento div para o card
    const cardContainer = document.createElement('div');
    cardContainer.className = 'col-lg-4 col-md-6';
    cardContainer.setAttribute('data-risco', risco);
    
    // Criar o HTML do card
    cardContainer.innerHTML = `
      <div class="card municipio-card h-100" data-id="${municipioId}" onclick="abrirModal('${municipioId}')" data-bs-toggle="tooltip" data-bs-placement="top" title="Clique para detalhes">
        <div class="card-header">
          <h5 class="mb-0">${municipio.nome}</h5>
          <span class="risco-${risco}">${risco === 'alto' ? 'Risco Alto' : risco === 'medio' ? 'Risco Médio' : 'Risco Baixo'}</span>
        </div>
        <div class="card-body">
          <div class="rio-info">
            <i class="fas fa-water rio-icone" aria-hidden="true"></i>
            <span>${municipio.rio}</span>
          </div>
          
          <div class="nivel-info">
            <div>
              <span class="fw-bold">Nível Atual:</span> ${municipio.nivelAtual}m
            </div>
            <div class="tendencia-${municipio.tendencia}">
              <i class="fas fa-arrow-${municipio.tendencia === 'subindo' ? 'up' : 'down'} me-1" aria-hidden="true"></i> ${municipio.variacao24h}m (24h)
            </div>
          </div>
          
          <div class="nivel-grafico nivel-${risco}">
            <div class="nivel-atual" style="width: ${Math.min((municipio.nivelAtual / municipio.nivelInundacao) * 100, 100)}%;"></div>
            <div class="nivel-marker nivel-alerta" style="left: ${(municipio.nivelAlerta / municipio.nivelInundacao) * 100}%;"></div>
            <div class="nivel-marker nivel-inundacao" style="left: 100%;"></div>
          </div>
          <div class="d-flex justify-content-between text-muted small">
            <span>0m</span>
            <span>Alerta: ${municipio.nivelAlerta}m</span>
            <span>Inundação: ${municipio.nivelInundacao}m</span>
          </div>
          
          <div class="mt-3 d-flex align-items-center">
            <span class="badge ${municipio.statusClass}">${municipio.status}</span>
            <small class="text-muted">Atualizado ${municipio.atualizacao}</small>
          </div>
        </div>
      </div>
    `;
    
    // Adicionar o card ao container
    container.appendChild(cardContainer);
  }
  
  console.log(`${Object.keys(dadosMunicipios).length} cards de municípios inicializados com sucesso.`);
  
  // Ordenar os cards por nível de risco
  ordenarCardsPorRisco();
  
  // Atualizar indicadores de alerta nos cards
  atualizarIndicadoresAlerta();
} 
