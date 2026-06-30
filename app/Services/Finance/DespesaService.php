<?php

namespace App\Services\Finance;

use App\Models\FornecedorDespesa;
use App\Models\TenantEvent;
use Carbon\Carbon;

class DespesaService
{
    /**
     * Constrói o array de dados do pivot pagadores→despesa para attach/sync.
     *
     * @param  array<int, array{pagador_id: int, percentual?: string|float|null, valor?: string|float|null}> $pagadores
     * @return array<int, array{event_id: int, percentual: float|null, valor: float|null}>
     */
    public function buildPivotData(TenantEvent $evento, array $pagadores): array
    {
        $pivotData = [];

        foreach ($pagadores as $p) {
            $pivotData[$p['pagador_id']] = [
                'event_id'   => $evento->id,
                'percentual' => isset($p['percentual']) && $p['percentual'] !== '' ? $p['percentual'] : null,
                'valor'      => isset($p['valor']) && $p['valor'] !== '' ? $p['valor'] : null,
            ];
        }

        return $pivotData;
    }

    /**
     * Cria as parcelas de uma despesa a partir de um array já validado.
     *
     * @param array<int, array{valor: float|string, vencimento: string}> $parcelas
     */
    public function createParcelas(FornecedorDespesa $despesa, TenantEvent $evento, array $parcelas, int $offset = 0): void
    {
        foreach ($parcelas as $i => $p) {
            $despesa->parcelas()->create([
                'event_id'        => $evento->id,
                'numero_parcela'  => $offset + $i + 1,
                'valor_parcela'   => $p['valor'],
                'data_vencimento' => Carbon::parse($p['vencimento']),
            ]);
        }
    }

    /**
     * Substitui as parcelas não-pagas e recria com os novos valores.
     * Preserva a sequência após as parcelas já pagas.
     *
     * @param array<int, array{valor: float|string, vencimento: string}> $parcelas
     */
    public function replaceUnpaidParcelas(FornecedorDespesa $despesa, TenantEvent $evento, array $parcelas): void
    {
        $paidCount = $despesa->parcelas()->where('status', 'pago')->count();
        $despesa->parcelas()->where('status', '!=', 'pago')->delete();
        $this->createParcelas($despesa, $evento, $parcelas, $paidCount);
    }
}
