<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property DespesaPagador $pivot
 */
class EventPagador extends Model
{
    protected $table = 'event_pagadores';

    protected $fillable = [
        'event_id',
        'user_id',
        'nome',
        'email',
        'tipo',
        'percentual_responsabilidade',
        'status',
    ];

    protected $casts = [
        'percentual_responsabilidade' => 'decimal:2',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TenantEvent::class, 'event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function despesas(): BelongsToMany
    {
        return $this->belongsToMany(FornecedorDespesa::class, 'despesa_pagadores', 'pagador_id', 'despesa_id')
            ->using(DespesaPagador::class)
            ->withPivot(['event_id', 'percentual', 'valor'])
            ->withTimestamps();
    }
}
