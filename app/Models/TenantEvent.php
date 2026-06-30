<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TenantEvent extends Model
{
    use SoftDeletes;

    protected $table = 'tenants_events';

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'descricao',
        'event_type',
        'data_inicio',
        'data_fim',
        'status',
        'configuracoes',
    ];

    protected $casts = [
        'configuracoes' => 'array',
        'data_inicio'   => 'date',
        'data_fim'      => 'date',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return HasMany<EventPagador, $this> */
    public function pagadores(): HasMany
    {
        return $this->hasMany(EventPagador::class, 'event_id');
    }

    /** @return HasMany<FornecedorDespesa, $this> */
    public function despesas(): HasMany
    {
        return $this->hasMany(FornecedorDespesa::class, 'event_id');
    }

    /** @return HasMany<ParcelaDespesa, $this> */
    public function parcelas(): HasMany
    {
        return $this->hasMany(ParcelaDespesa::class, 'event_id');
    }

    /** @return HasMany<EventChecklistTask, $this> */
    public function checklistTasks(): HasMany
    {
        return $this->hasMany(EventChecklistTask::class, 'event_id')->orderBy('order');
    }
}
