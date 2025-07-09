// ==MiruExtension==
// @name Nyaa
// @version v1.0.0
// @author Loucoi
// @lang pt
// @icon https://nyaa.si/static/favicon.ico
// @package nyaa.si
// @type bangumi
// @webSite https://nyaa.si/
// ==/MiruExtension==

export default class extends Extension {
  constructor() {
    super();
    this.baseUrl = "https://nyaa.si";
    this.searchEndpoint = "/?f=0&c=0_0&q=";
    this.categories = {
      "anime": "1_2",
      "music": "2_0", 
      "games": "6_0",
      "software": "1_1",
      "all": "0_0"
    };
  }

  // Função para buscar torrents
  async search(query, options = {}) {
    try {
      const category = options.category || "all";
      const categoryCode = this.settings.categories[category] || "0_0";
      const page = options.page || 1;
      
      const searchUrl = ${this.settings.baseUrl}/?f=0&c=${categoryCode}&q=${encodeURIComponent(query)}&p=${page};
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const html = await response.text();
      return this.parseSearchResults(html);
      
    } catch (error) {
      console.error('Erro na busca:', error);
      return [];
    }
  },

  // Função para analisar os resultados da busca
  parseSearchResults(html) {
    const results = [];
    
    // Usar regex para extrair dados da tabela de resultados
    const rowRegex = /<tr class="(?:default|success|danger)"[^>]>(.?)<\/tr>/gs;
    const matches = html.match(rowRegex);
    
    if (!matches) return results;
    
    matches.forEach(row => {
      try {
        const torrentData = this.parseRow(row);
        if (torrentData) {
          results.push(torrentData);
        }
      } catch (error) {
        console.error('Erro ao processar linha:', error);
      }
    });
    
    return results;
  },

  // Função para processar cada linha da tabela
  parseRow(row) {
    // Extrair categoria
    const categoryMatch = row.match(/title="([^"]+)"/);
    const category = categoryMatch ? categoryMatch[1] : 'Unknown';
    
    // Extrair título e link
    const titleMatch = row.match(/<a href="\/view\/(\d+)"[^>]*title="([^"]+)"/);
    if (!titleMatch) return null;
    
    const torrentId = titleMatch[1];
    const title = titleMatch[2];
    
    // Extrair link de download
    const downloadMatch = row.match(/<a href="(\/download\/[^"]+)"/);
    const downloadLink = downloadMatch ? https://nyaa.si${downloadMatch[1]} : null;
    
    // Extrair magnet link
    const magnetMatch = row.match(/href="(magnet:[^"]+)"/);
    const magnetLink = magnetMatch ? magnetMatch[1] : null;
    
    // Extrair tamanho
    const sizeMatch = row.match(/<td class="text-center"[^>]*>([^<]+)<\/td>/);
    const size = sizeMatch ? sizeMatch[1].trim() : 'Unknown';
    
    // Extrair data
    const dateMatch = row.match(/<td class="text-center" data-timestamp="(\d+)"/);
    const timestamp = dateMatch ? parseInt(dateMatch[1]) : null;
    const date = timestamp ? new Date(timestamp * 1000) : null;
    
    // Extrair seeders e leechers
    const seedLeechMatch = row.match(/<td class="text-center"[^>]>(\d+)<\/td>\s<td class="text-center"[^>]*>(\d+)<\/td>/);
    const seeders = seedLeechMatch ? parseInt(seedLeechMatch[1]) : 0;
    const leechers = seedLeechMatch ? parseInt(seedLeechMatch[2]) : 0;
    
    return {
      id: torrentId,
      title: title,
      category: category,
      size: size,
      date: date,
      seeders: seeders,
      leechers: leechers,
      downloadLink: downloadLink,
      magnetLink: magnetLink,
      infoLink: https://nyaa.si/view/${torrentId},
      source: "Nyaa.si"
    };
  },

  // Função para obter detalhes de um torrent específico
  async getTorrentDetails(torrentId) {
    try {
      const url = ${this.settings.baseUrl}/view/${torrentId};
      const response = await fetch(url);
      const html = await response.text();
      
      return this.parseDetailPage(html);
      
    } catch (error) {
      console.error('Erro ao obter detalhes:', error);
      return null;
    }
  },

  // Função para analisar a página de detalhes
  parseDetailPage(html) {
    const details = {};
    
    // Extrair informações da página de detalhes
    const infoMatch = html.match(/<div class="panel-body">(.*?)<\/div>/s);
    if (infoMatch) {
      const infoContent = infoMatch[1];
      
      // Extrair hash
      const hashMatch = infoContent.match(/Hash:<\/strong>\s*([a-fA-F0-9]+)/);
      details.hash = hashMatch ? hashMatch[1] : null;
      
      // Extrair descrição
      const descMatch = html.match(/<div id="torrent-description"[^>]>(.?)<\/div>/s);
      details.description = descMatch ? descMatch[1].trim() : '';
    }
    
    return details;
  },

  // Função para baixar torrent
  async downloadTorrent(torrentId, downloadLink) {
    try {
      if (!downloadLink) {
        throw new Error('Link de download não disponível');
      }
      
      // Retornar informações para o Miru processar o download
      return {
        success: true,
        downloadUrl: downloadLink,
        type: 'torrent',
        filename: nyaa_${torrentId}.torrent
      };
      
    } catch (error) {
      console.error('Erro no download:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Função para aplicar filtros de busca
  getSearchFilters() {
    return {
      categories: [
        { value: "all", label: "Todas as categorias" },
        { value: "anime", label: "Anime" },
        { value: "music", label: "Música" },
        { value: "games", label: "Jogos" },
        { value: "software", label: "Software" }
      ],
      sortOptions: [
        { value: "date", label: "Data" },
        { value: "seeders", label: "Seeders" },
        { value: "leechers", label: "Leechers" },
        { value: "size", label: "Tamanho" }
      ]
    };
  },

  // Função para formatar resultado para exibição
  formatResult(torrent) {
    return {
      title: torrent.title,
      subtitle: ${torrent.category} • ${torrent.size} • S:${torrent.seeders} L:${torrent.leechers},
      image: null,
      url: torrent.infoLink,
      downloadUrl: torrent.downloadLink,
      magnetUrl: torrent.magnetLink,
      metadata: {
        source: torrent.source,
        seeders: torrent.seeders,
        leechers: torrent.leechers,
        size: torrent.size,
        date: torrent.date
      }
    };
  }
};

// Exportar a extensão
if (typeof module !== 'undefined' && module.exports) {
  module.exports = extension;
} else if (typeof window !== 'undefined') {
  window.NyaaExtension = extension;
}

// Exemplo de uso:
/*
// Buscar torrents
const results = await extension.search("attack on titan", { category: "anime" });
console.log(results);

// Obter detalhes de um torrent
const details = await extension.getTorrentDetails("1234567");
console.log(details);

// Baixar torrent
const download = await extension.downloadTorrent("1234567", "https://nyaa.si/download/1234567.torrent");
console.log(download);
*/
