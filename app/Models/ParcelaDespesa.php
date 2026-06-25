<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParcelaDespesa extends Model
{
    protected $table = 'parcelas_despesas';

    protected $fillable = [
        'event_id',
        'despesa_id',
        'numero_parcela',
        'valor_parcela',
        'data_vencimento',
        'data_pagamento',
        'status',
        'comprovante_url',
        'observacoes',
    ];

    protected $casts = [
        'valor_parcela'  => 'decimal:2',
        'data_vencimento' => 'date',
        'data_pagamento'  => 'date',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TenantEvent::class, 'event_id');
    }

    public function despesa(): BelongsTo
    {
        return $this->belongsTo(FornecedorDespesa::class, 'despesa_id');
    }

    public function isPago(): bool
    {
        return $this->status === 'pago';
    }

    public function isAtrasado(): bool
    {
        return $this->status === 'pendente' && $this->data_vencimento->isPast();
    }
}
