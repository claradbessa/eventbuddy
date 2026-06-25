<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FornecedorDespesa extends Model
{
    use SoftDeletes;

    protected $table = 'fornecedores_despesas';

    protected $fillable = [
        'event_id',
        'fornecedor_nome',
        'categoria',
        'descricao',
        'valor_total',
        'comprovante_url',
        'observacoes',
    ];

    protected $casts = [
        'valor_total' => 'decimal:2',
    ];

    protected $appends = ['status_pagamento'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TenantEvent::class, 'event_id');
    }

    public function parcelas(): HasMany
    {
        return $this->hasMany(ParcelaDespesa::class, 'despesa_id')->orderBy('numero_parcela');
    }

    public function pagadores(): BelongsToMany
    {
        return $this->belongsToMany(EventPagador::class, 'despesa_pagadores', 'despesa_id', 'pagador_id')
            ->using(DespesaPagador::class)
            ->withPivot(['event_id', 'percentual', 'valor'])
            ->withTimestamps();
    }

    // Status derivado das parcelas — evita dado duplicado/inconsistente
    public function getStatusPagamentoAttribute(): string
    {
        $parcelas = $this->parcelas;

        if ($parcelas->isEmpty()) {
            return 'pendente';
        }

        if ($parcelas->every(fn($p) => $p->status === 'pago')) {
            return 'pago';
        }

        if ($parcelas->contains(fn($p) => $p->isAtrasado())) {
            return 'atrasado';
        }

        if ($parcelas->every(fn($p) => $p->status === 'cancelado')) {
            return 'cancelado';
        }

        return 'pendente';
    }

    // Gera N parcelas com valores e vencimentos calculados
    public function gerarParcelas(int $quantidade, \Carbon\Carbon $primeiroVencimento): void
    {
        $valorParcela = round($this->valor_total / $quantidade, 2);
        $diferenca    = $this->valor_total - $valorParcela * $quantidade;

        $this->parcelas()->delete();

        for ($i = 1; $i <= $quantidade; $i++) {
            $valor = $valorParcela + ($i === $quantidade ? $diferenca : 0);

            $this->parcelas()->create([
                'event_id'       => $this->event_id,
                'numero_parcela' => $i,
                'valor_parcela'  => $valor,
                'data_vencimento' => $primeiroVencimento->copy()->addMonthsNoOverflow($i - 1),
            ]);
        }
    }
}
