<?php

namespace App\Services\Guest;

use App\Models\Guest;
use App\Models\TenantEvent;
use Illuminate\Validation\ValidationException;

class GuestService
{
    /** @var string[] */
    private const VALID_ROLES = [
        'noivo', 'padrinho', 'pajem',
        'debutante', 'homenageado',
        'vip', 'formando', 'palestrante',
    ];

    /**
     * @param array{name: string, tier: string, status?: string, group?: string|null, special_role?: string|null, table_number?: string|null, invited_by?: string|null, companion_names?: list<array{name: string, age_group: string}>|null, accompanists_count?: int|string|null, phone?: string|null} $data
     */
    public function create(TenantEvent $evento, array $data): Guest
    {
        return $evento->guests()->create([
            'name'               => $data['name'],
            'tier'               => $data['tier'],
            'status'             => $data['status'] ?? 'pending',
            'group'              => $data['group'] ?? null,
            'special_role'       => $this->validateSpecialRole($data['special_role'] ?? null),
            'table_number'       => $this->sanitizeShortText($data['table_number'] ?? null, 50),
            'invited_by'         => $this->sanitizeShortText($data['invited_by'] ?? null, 100),
            'companion_names'    => $this->validateCompanionNames($data['companion_names'] ?? null),
            'accompanists_count' => (int) ($data['accompanists_count'] ?? 0),
            'phone'              => $this->sanitizePhone($data['phone'] ?? null),
        ]);
    }

    /**
     * @param array{name: string, tier: string, status?: string, group?: string|null, special_role?: string|null, table_number?: string|null, invited_by?: string|null, companion_names?: list<array{name: string, age_group: string}>|null, accompanists_count?: int|string|null, phone?: string|null} $data
     */
    public function update(Guest $guest, array $data, bool $updateFamilyTables = false): Guest
    {
        $sanitizedTable = $this->sanitizeShortText($data['table_number'] ?? null, 50);

        $rawGroup = $data['group'] ?? null;
        $group    = (is_string($rawGroup) && trim($rawGroup) !== '') ? trim($rawGroup) : null;

        $guest->update([
            'name'               => $data['name'],
            'tier'               => $data['tier'],
            'status'             => $data['status'] ?? $guest->status,
            'group'              => $group,
            'special_role'       => $this->validateSpecialRole($data['special_role'] ?? null),
            'table_number'       => $sanitizedTable,
            'invited_by'         => $this->sanitizeShortText($data['invited_by'] ?? null, 100),
            'companion_names'    => $this->validateCompanionNames($data['companion_names'] ?? null),
            'accompanists_count' => (int) ($data['accompanists_count'] ?? 0),
            'phone'              => $this->sanitizePhone($data['phone'] ?? null),
        ]);

        if ($updateFamilyTables && $group !== null) {
            Guest::where('event_id', $guest->event_id)
                 ->where('group', $group)
                 ->where('id', '!=', $guest->getKey())
                 ->update(['table_number' => $sanitizedTable]);
        }

        return $guest->fresh() ?? $guest;
    }

    public function updateStatus(Guest $guest, string $status): void
    {
        $guest->update(['status' => $status]);
    }

    public function delete(Guest $guest): void
    {
        $guest->delete();
    }

    /**
     * Deletes multiple guests that belong to the given event.
     * IDs not owned by the event are silently skipped — the WHERE clause is the security boundary.
     *
     * @param list<int> $ids
     */
    public function bulkDelete(array $ids, TenantEvent $evento): int
    {
        if (empty($ids)) {
            return 0;
        }
        $count = Guest::whereIn('id', $ids)
            ->where('event_id', $evento->getKey())
            ->delete();
        return is_int($count) ? $count : 0;
    }

    /**
     * Returns per-tier head counts (principals + accompanists).
     *
     * @return array{
     *     A: array{guests: int, total: int},
     *     B: array{guests: int, total: int},
     *     C: array{guests: int, total: int},
     *     overall: array{guests: int, total: int}
     * }
     */
    public function summary(TenantEvent $evento): array
    {
        $tiers = [
            'A' => ['guests' => 0, 'total' => 0],
            'B' => ['guests' => 0, 'total' => 0],
            'C' => ['guests' => 0, 'total' => 0],
        ];

        $evento->guests()->get(['tier', 'accompanists_count'])
            ->each(function (Guest $g) use (&$tiers): void {
                if (! isset($tiers[$g->tier])) {
                    return;
                }
                $tiers[$g->tier]['guests']++;
                $tiers[$g->tier]['total'] += 1 + $g->accompanists_count;
            });

        return [
            'A'       => $tiers['A'],
            'B'       => $tiers['B'],
            'C'       => $tiers['C'],
            'overall' => [
                'guests' => $tiers['A']['guests'] + $tiers['B']['guests'] + $tiers['C']['guests'],
                'total'  => $tiers['A']['total']  + $tiers['B']['total']  + $tiers['C']['total'],
            ],
        ];
    }

    /**
     * @param mixed $names
     * @return list<array{name: string, age_group: string}>|null
     */
    private function validateCompanionNames(mixed $names): ?array
    {
        if (!is_array($names) || empty($names)) {
            return null;
        }

        $validAgeGroups = ['adult', 'child', 'baby'];
        $cleaned = [];

        foreach ($names as $item) {
            if (!is_array($item)) {
                continue;
            }

            $rawName = isset($item['name']) && is_string($item['name']) ? $item['name'] : '';
            $name    = mb_substr(trim($rawName), 0, 255);

            if ($name === '') {
                continue;
            }

            $rawAge   = isset($item['age_group']) && is_string($item['age_group']) ? $item['age_group'] : 'adult';
            $ageGroup = in_array($rawAge, $validAgeGroups, true) ? $rawAge : 'adult';

            $cleaned[] = ['name' => $name, 'age_group' => $ageGroup];
        }

        return empty($cleaned) ? null : array_slice($cleaned, 0, 20);
    }

    private function sanitizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }
        // Strip spaces, parens and hyphens; preserve leading + for E.164 international numbers
        $cleaned = preg_replace('/[\s()\-]/', '', $phone) ?? '';
        return $cleaned !== '' ? mb_substr($cleaned, 0, 20) : null;
    }

    private function sanitizeShortText(?string $value, int $maxLength): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return mb_substr(trim($value), 0, $maxLength);
    }

    private function validateSpecialRole(?string $role): ?string
    {
        if ($role === null) {
            return null;
        }

        if (! in_array($role, self::VALID_ROLES, strict: true)) {
            throw ValidationException::withMessages([
                'special_role' => 'Papel especial inválido.',
            ]);
        }

        return $role;
    }
}
