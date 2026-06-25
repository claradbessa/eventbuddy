<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class DespesaPagador extends Pivot
{
    protected $table = 'despesa_pagadores';

    public $incrementing = true;

    protected $fillable = [
        'event_id',
        'despesa_id',
        'pagador_id',
        'percentual',
        'valor',
    ];

    protected $casts = [
        'percentual' => 'decimal:2',
        'valor'      => 'decimal:2',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TenantEvent::class, 'event_id');
    }

    public function despesa(): BelongsTo
    {
        return $this->belongsTo(FornecedorDespesa::class, 'despesa_id');
    }

    public function pagador(): BelongsTo
    {
        return $this->belongsTo(EventPagador::class, 'pagador_id');
    }
}
