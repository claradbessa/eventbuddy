<?php

use App\Models\FornecedorDespesa;
use App\Models\ParcelaDespesa;
use App\Models\TenantEvent;
use App\Models\User;
use App\Services\Finance\DespesaService;
use Carbon\Carbon;

describe('DespesaService::createParcelas', function () {
    beforeEach(function () {
        $this->service = new DespesaService();

        $user = User::factory()->create();

        $this->evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Evento Teste',
            'slug'       => 'evento-teste',
            'data_inicio' => now()->addMonths(6)->toDateString(),
            'status'     => 'ativo',
        ]);

        $this->despesa = FornecedorDespesa::create([
            'event_id'        => $this->evento->id,
            'fornecedor_nome' => 'Buffet Gourmet',
            'categoria'       => 'Buffet',
            'valor_total'     => 3000.00,
        ]);
    });

    it('creates the exact number of parcelas requested', function () {
        $parcelas = [
            ['valor' => 1000.00, 'vencimento' => '2027-01-10'],
            ['valor' => 1000.00, 'vencimento' => '2027-02-10'],
            ['valor' => 1000.00, 'vencimento' => '2027-03-10'],
        ];

        $this->service->createParcelas($this->despesa, $this->evento, $parcelas);

        expect($this->despesa->parcelas()->count())->toBe(3);
    });

    it('assigns sequential numero_parcela starting from 1', function () {
        $parcelas = [
            ['valor' => 500.00, 'vencimento' => '2027-01-10'],
            ['valor' => 500.00, 'vencimento' => '2027-02-10'],
        ];

        $this->service->createParcelas($this->despesa, $this->evento, $parcelas);

        $numbers = $this->despesa->parcelas()->pluck('numero_parcela')->toArray();
        expect($numbers)->toBe([1, 2]);
    });

    it('applies offset for numero_parcela when specified', function () {
        $parcelas = [
            ['valor' => 1500.00, 'vencimento' => '2027-04-10'],
            ['valor' => 1500.00, 'vencimento' => '2027-05-10'],
        ];

        $this->service->createParcelas($this->despesa, $this->evento, $parcelas, offset: 2);

        $numbers = $this->despesa->parcelas()->pluck('numero_parcela')->toArray();
        expect($numbers)->toBe([3, 4]);
    });

    it('saves correct valor_parcela for each entry', function () {
        $parcelas = [
            ['valor' => 1200.00, 'vencimento' => '2027-01-10'],
            ['valor' => 900.00,  'vencimento' => '2027-02-10'],
            ['valor' => 900.00,  'vencimento' => '2027-03-10'],
        ];

        $this->service->createParcelas($this->despesa, $this->evento, $parcelas);

        $valores = $this->despesa->parcelas()->pluck('valor_parcela')->map(fn($v) => (float) $v)->toArray();
        expect($valores)->toBe([1200.00, 900.00, 900.00]);
    });

    it('saves correct data_vencimento for each parcela', function () {
        $parcelas = [
            ['valor' => 1000.00, 'vencimento' => '2027-01-15'],
            ['valor' => 1000.00, 'vencimento' => '2027-02-15'],
        ];

        $this->service->createParcelas($this->despesa, $this->evento, $parcelas);

        $datas = $this->despesa->parcelas()->pluck('data_vencimento')->map(fn($d) => $d->toDateString())->toArray();
        expect($datas)->toBe(['2027-01-15', '2027-02-15']);
    });

    it('stamps correct event_id on every parcela', function () {
        $parcelas = [['valor' => 3000.00, 'vencimento' => '2027-01-10']];

        $this->service->createParcelas($this->despesa, $this->evento, $parcelas);

        expect($this->despesa->parcelas()->first()->event_id)->toBe($this->evento->id);
    });
});

describe('DespesaService::replaceUnpaidParcelas', function () {
    beforeEach(function () {
        $this->service = new DespesaService();

        $user = User::factory()->create();

        $this->evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Evento Teste',
            'slug'       => 'evento-teste-2',
            'data_inicio' => now()->addMonths(6)->toDateString(),
            'status'     => 'ativo',
        ]);

        $this->despesa = FornecedorDespesa::create([
            'event_id'        => $this->evento->id,
            'fornecedor_nome' => 'Decoração Premium',
            'categoria'       => 'Decoração',
            'valor_total'     => 5000.00,
        ]);
    });

    it('deletes all pending parcelas before creating new ones', function () {
        ParcelaDespesa::create([
            'event_id'        => $this->evento->id,
            'despesa_id'      => $this->despesa->id,
            'numero_parcela'  => 1,
            'valor_parcela'   => 2500.00,
            'data_vencimento' => '2027-01-10',
            'status'          => 'pendente',
        ]);

        $newParcelas = [
            ['valor' => 1666.67, 'vencimento' => '2027-01-10'],
            ['valor' => 1666.67, 'vencimento' => '2027-02-10'],
            ['valor' => 1666.66, 'vencimento' => '2027-03-10'],
        ];

        $this->service->replaceUnpaidParcelas($this->despesa, $this->evento, $newParcelas);

        expect($this->despesa->parcelas()->count())->toBe(3);
    });

    it('preserves paid parcelas and sequences new ones after them', function () {
        ParcelaDespesa::create([
            'event_id'        => $this->evento->id,
            'despesa_id'      => $this->despesa->id,
            'numero_parcela'  => 1,
            'valor_parcela'   => 2500.00,
            'data_vencimento' => '2026-12-10',
            'status'          => 'pago',
            'data_pagamento'  => '2026-12-08',
        ]);

        ParcelaDespesa::create([
            'event_id'        => $this->evento->id,
            'despesa_id'      => $this->despesa->id,
            'numero_parcela'  => 2,
            'valor_parcela'   => 2500.00,
            'data_vencimento' => '2027-01-10',
            'status'          => 'pendente',
        ]);

        $newParcelas = [['valor' => 2500.00, 'vencimento' => '2027-02-10']];

        $this->service->replaceUnpaidParcelas($this->despesa, $this->evento, $newParcelas);

        $all = $this->despesa->parcelas()->orderBy('numero_parcela')->get();

        expect($all)->toHaveCount(2)
            ->and($all[0]->status)->toBe('pago')
            ->and($all[0]->numero_parcela)->toBe(1)
            ->and($all[1]->status)->toBe('pendente')
            ->and($all[1]->numero_parcela)->toBe(2); // offset = 1 paid
    });
});

describe('FornecedorDespesa::gerarParcelas (modelo)', function () {
    beforeEach(function () {
        $user = User::factory()->create();

        $evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Evento Cálculo',
            'slug'       => 'evento-calculo',
            'data_inicio' => now()->addMonths(6)->toDateString(),
            'status'     => 'ativo',
        ]);

        $this->despesa = FornecedorDespesa::create([
            'event_id'        => $evento->id,
            'fornecedor_nome' => 'Fotografo',
            'categoria'       => 'Fotografia',
            'valor_total'     => 100.00,
        ]);
    });

    it('distributes valor_total evenly across parcelas', function () {
        $this->despesa->gerarParcelas(4, Carbon::parse('2027-01-01'));

        $valores = $this->despesa->parcelas()->pluck('valor_parcela')->map(fn($v) => (float) $v)->toArray();
        $sum     = array_sum($valores);

        expect($sum)->toBe(100.00)
            ->and($valores)->toHaveCount(4);
    });

    it('absorbs rounding difference in the last parcela', function () {
        // R$100 / 3 = R$33.33 each; remainder 0.01 goes to last
        $this->despesa->gerarParcelas(3, Carbon::parse('2027-01-01'));

        $parcelas = $this->despesa->parcelas()->orderBy('numero_parcela')->get();

        expect((float) $parcelas[0]->valor_parcela)->toBe(33.33)
            ->and((float) $parcelas[1]->valor_parcela)->toBe(33.33)
            ->and((float) $parcelas[2]->valor_parcela)->toBe(33.34); // remainder here
    });

    it('spaces vencimentos one month apart without overflow', function () {
        $this->despesa->gerarParcelas(3, Carbon::parse('2027-01-31'));

        $datas = $this->despesa->parcelas()->orderBy('numero_parcela')->pluck('data_vencimento')
            ->map(fn($d) => $d->toDateString())
            ->toArray();

        // addMonthsNoOverflow: 31 Jan + 1 month = 28 Feb (no overflow to Mar)
        expect($datas[0])->toBe('2027-01-31')
            ->and($datas[1])->toBe('2027-02-28')
            ->and($datas[2])->toBe('2027-03-31');
    });
});
