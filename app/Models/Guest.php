<?php

namespace App\Models;

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
}
