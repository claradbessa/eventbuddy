<?php

namespace Database\Seeders;

use App\Models\EventPagador;
use App\Models\FornecedorDespesa;
use App\Models\TenantEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class EventBuddyScenarioSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Usuário principal ──────────────────────────────────────────────
        $clara = User::firstOrCreate(
            ['email' => 'clara@eventbuddy.test'],
            [
                'name'     => 'Clara Bessa',
                'password' => Hash::make('password'),
            ]
        );

        $this->command->info("Usuário: {$clara->name} (#{$clara->id})");

        // ── 2. Evento ─────────────────────────────────────────────────────────
        $evento = TenantEvent::firstOrCreate(
            ['slug' => 'casamento-clara-erick-2026'],
            [
                'owner_id'    => $clara->id,
                'name'        => 'Casamento Clara & Erick',
                'descricao'   => 'Casamento civil e festa',
                'data_inicio' => Carbon::parse('2026-12-20'),
                'data_fim'    => Carbon::parse('2026-12-21'),
                'status'      => 'ativo',
                'configuracoes' => ['moeda' => 'BRL'],
            ]
        );

        $this->command->info("Evento: {$evento->name} (#{$evento->id})");

        // ── 3. Pagadores ──────────────────────────────────────────────────────
        [$pagClara, $pagNoivo] = $this->criarPagadores($evento);

        // ── 4. Despesa à vista — Taxa do Cartório ─────────────────────────────
        $this->criarDespesaCartorio($evento, $pagClara, $pagNoivo);

        // ── 5. Despesa parcelada — Buffet/Espaço ─────────────────────────────
        $this->criarDespesaBuffet($evento, $pagNoivo, $pagClara);

        $this->command->info('');
        $this->command->info('Seeder concluído com sucesso!');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function criarPagadores(TenantEvent $evento): array
    {
        $pagadores = [
            ['nome' => 'Clara',         'email' => 'clara@eventbuddy.test', 'tipo' => 'interno', 'percentual_responsabilidade' => 50.00],
            ['nome' => 'Erick',          'email' => 'erick@eventbuddy.test', 'tipo' => 'externo', 'percentual_responsabilidade' => 50.00],
        ];

        $criados = [];
        foreach ($pagadores as $dados) {
            $p = EventPagador::firstOrCreate(
                ['event_id' => $evento->id, 'email' => $dados['email']],
                array_merge($dados, ['event_id' => $evento->id, 'status' => 'ativo'])
            );
            $criados[] = $p;
            $this->command->line("  Pagador: {$p->nome} (#{$p->id})");
        }

        return $criados;
    }

    private function criarDespesaCartorio(TenantEvent $evento, EventPagador $pagClara, EventPagador $pagNoivo): void
    {
        $this->command->info('');
        $this->command->info('Despesa 1: Taxa do Cartório (à vista, 50/50)');

        $despesa = FornecedorDespesa::create([
            'event_id'       => $evento->id,
            'fornecedor_nome' => 'Cartório do 1º Ofício',
            'categoria'      => 'Documentação',
            'descricao'      => 'Taxa de habilitação e certidão de casamento civil',
            'valor_total'    => 500.00,
            'observacoes'    => 'Pago em dinheiro na data do cartório',
        ]);

        // Pivot: 50% Clara + 50% Noivo
        $despesa->pagadores()->attach([
            $pagClara->id => ['event_id' => $evento->id, 'percentual' => 50.00],
            $pagNoivo->id => ['event_id' => $evento->id, 'percentual' => 50.00],
        ]);

        // 1 parcela à vista, já paga
        $despesa->gerarParcelas(1, Carbon::parse('2026-06-10'));

        $despesa->parcelas()->update([
            'status'         => 'pago',
            'data_pagamento' => Carbon::parse('2026-06-10'),
        ]);

        $this->command->line("  Parcelas: 1 | Status: {$despesa->fresh()->status_pagamento}");
    }

    private function criarDespesaBuffet(TenantEvent $evento, EventPagador $pagNoivo, EventPagador $pagClara): void
    {
        $this->command->info('');
        $this->command->info('Despesa 2: Buffet/Espaço (6x, 60% Noivo / 40% Clara)');

        $despesa = FornecedorDespesa::create([
            'event_id'        => $evento->id,
            'fornecedor_nome' => 'Espaço Villa Verde',
            'categoria'       => 'Buffet & Espaço',
            'descricao'       => 'Aluguel do espaço + buffet completo para 150 pessoas',
            'valor_total'     => 12000.00,
            'observacoes'     => 'Contrato assinado em 2026-06-01. Reajuste bloqueado até a data.',
        ]);

        // Pivot: 60% Noivo + 40% Clara
        $despesa->pagadores()->attach([
            $pagNoivo->id => ['event_id' => $evento->id, 'percentual' => 60.00],
            $pagClara->id => ['event_id' => $evento->id, 'percentual' => 40.00],
        ]);

        // 6 parcelas mensais a partir de julho/2026
        $despesa->gerarParcelas(6, Carbon::parse('2026-07-01'));

        // Parcela 1 → paga; parcelas 2–6 → pendentes (estado gerado por padrão)
        $despesa->parcelas()
            ->where('numero_parcela', 1)
            ->update([
                'status'         => 'pago',
                'data_pagamento' => Carbon::parse('2026-07-01'),
                'comprovante_url' => 'recibos/buffet-parcela-1.pdf',
            ]);

        $parcelas = $despesa->fresh(['parcelas'])->parcelas;

        foreach ($parcelas as $p) {
            $this->command->line(
                sprintf(
                    '  Parcela %d/%d — R$ %s — venc. %s — %s',
                    $p->numero_parcela,
                    $parcelas->count(),
                    number_format($p->valor_parcela, 2, ',', '.'),
                    $p->data_vencimento->format('d/m/Y'),
                    strtoupper($p->status)
                )
            );
        }

        $this->command->line("  Status geral da despesa: {$despesa->fresh()->status_pagamento}");
    }
}
