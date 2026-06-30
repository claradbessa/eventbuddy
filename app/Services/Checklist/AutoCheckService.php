<?php

namespace App\Services\Checklist;

use App\Models\EventChecklistTask;
use App\Models\TenantEvent;

class AutoCheckService
{
    private const KEYWORD_MAP = [
        'fotografia'  => ['foto', 'fotograf', 'cinegraf', 'filmagem', 'video', 'drone', 'album'],
        'buffet'      => ['buffet', 'catering', 'coffee', 'alimentac', 'refeic', 'gastronomia', 'jantar', 'almoco', 'cardapio'],
        'espaco'      => ['espaco', 'local', 'cerimoni', 'salao', 'auditorio', 'venue', 'recanto', 'chacara', 'sitio', 'fazenda', 'clube', 'hotel', 'pousada', 'casa de festa'],
        'musica'      => ['dj', 'banda', 'musica', 'som', 'iluminac', 'luz cenica', 'led', 'trio', 'quarteto', 'violinis', 'sanfonei'],
        'decoracao'   => ['decorac', 'decor', 'floral', 'flores', 'cenograf', 'balao', 'arranjo', 'instala'],
        'maquiagem'   => ['maquiagem', 'maquiac', 'make', 'cabelo', 'beleza', 'hair', 'noiva', 'penteado', 'dia da noiva'],
        'bolo'        => ['bolo', 'confeit', 'doceria', 'doces', 'sobremesa', 'candy', 'mesinha'],
        'bar'         => ['open bar', 'bar', 'drinks', 'bebidas', 'coquetel', 'churrasco', 'sommelier', 'cerveja', 'destilado'],
        'audiovisual' => ['audiovisual', 'audio visual', 'av ', 'projetor', 'microfone', 'sonorizac', 'telao', 'streaming', 'transmissao', 'internet', 'palco', 'estrutura'],
        'transporte'  => ['transport', 'limusin', 'onibus', 'van', 'transfer', 'taxi', 'motorista', 'veiculo'],
        'seguranca'   => ['seguran', 'recepcao', 'portaria', 'credenciamento', 'brigadista'],
        'recreacao'   => ['recreac', 'animac', 'brinquedo', 'kids', 'pula pula', 'circo', 'malabarista', 'palha'],
        'assessoria'  => ['assessoria', 'cerimonial', 'organizac', 'empresa de event', 'producao', 'coord'],
    ];

    public function checkByCategory(TenantEvent $evento, ?string $rawCategoria): void
    {
        if (! $rawCategoria) {
            return;
        }

        $slugs = $this->normalizeCategoriaToSlugs($rawCategoria);

        if (empty($slugs)) {
            return;
        }

        $tasks = EventChecklistTask::where('event_id', $evento->id)
            ->where('status', 'pendente')
            ->whereIn('auto_check_category', $slugs)
            ->get(['id', 'title']);

        if ($tasks->isEmpty()) {
            return;
        }

        EventChecklistTask::whereIn('id', $tasks->pluck('id'))
            ->update([
                'status'       => 'concluido',
                'completed_at' => now(),
                'updated_at'   => now(),
            ]);

        $count   = $tasks->count();
        $message = $count === 1
            ? "'{$tasks->first()->title}' foi marcado automaticamente no checklist!"
            : "{$count} itens do checklist foram marcados automaticamente!";

        session()->flash('toast', ['type' => 'success', 'message' => $message]);
    }

    /** @return string[] */
    public function normalizeCategoriaToSlugs(string $categoria): array
    {
        $accents = ['á','à','â','ã','é','è','ê','í','ì','î','ó','ò','ô','õ','ú','ù','û','ü','ç'];
        $plain   = ['a','a','a','a','e','e','e','i','i','i','o','o','o','o','u','u','u','u','c'];
        $text    = mb_strtolower(str_replace($accents, $plain, $categoria));

        $found = [];
        foreach (self::KEYWORD_MAP as $slug => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($text, $kw)) {
                    $found[] = $slug;
                    break;
                }
            }
        }

        return $found;
    }
}
