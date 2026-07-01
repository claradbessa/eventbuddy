<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Guest extends Model
{
    protected $table = 'event_guests';

    protected $fillable = [
        'event_id',
        'name',
        'tier',
        'status',
        'group',
        'special_role',
        'table_number',
        'invited_by',
        'companion_names',
        'accompanists_count',
        'phone',
    ];

    protected $casts = [
        'accompanists_count' => 'integer',
        'companion_names'    => 'array',
    ];

    /** @return BelongsTo<TenantEvent, $this> */
    public function evento(): BelongsTo
    {
        return $this->belongsTo(TenantEvent::class, 'event_id');
    }

    /**
     * @param Builder<Guest> $query
     * @return Builder<Guest>
     */
    public function scopeByInvitedBy(Builder $query, ?string $invitedBy): Builder
    {
        if ($invitedBy === null || $invitedBy === '') {
            return $query;
        }
        return $query->where('invited_by', $invitedBy);
    }

    /**
     * @param Builder<Guest> $query
     * @return Builder<Guest>
     */
    public function scopeByGroup(Builder $query, ?string $group): Builder
    {
        if ($group === null || $group === '') {
            return $query;
        }
        return $query->where('group', $group);
    }

    /**
     * @param Builder<Guest> $query
     * @return Builder<Guest>
     */
    public function scopeByTable(Builder $query, ?string $table): Builder
    {
        if ($table === null || $table === '') {
            return $query;
        }
        if ($table === '__none__') {
            return $query->whereNull('table_number');
        }
        return $query->where('table_number', $table);
    }
}
