<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventChecklistTask extends Model
{
    protected $table = 'event_checklist_tasks';

    protected $fillable = [
        'event_id',
        'title',
        'status',
        'priority',
        'due_date',
        'completed_at',
        'order',
        'auto_check_category',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'due_date'     => 'date',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<TenantEvent, $this> */
    public function evento(): BelongsTo
    {
        return $this->belongsTo(TenantEvent::class, 'event_id');
    }
}
