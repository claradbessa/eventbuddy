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
     * @param array{name: string, tier: string, status?: string, group?: string|null, special_role?: string|null, table_number?: string|null, invited_by?: string|null, companion_names?: list<string>|null, accompanists_count?: int|string|null} $data
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
        ]);
    }

    /**
     * @param array{name: string, tier: string, status?: string, group?: string|null, special_role?: string|null, table_number?: string|null, invited_by?: string|null, companion_names?: list<string>|null, accompanists_count?: int|string|null} $data
     */
    public function update(Guest $guest, array $data): Guest
    {
        $guest->update([
            'name'               => $data['name'],
            'tier'               => $data['tier'],
            'status'             => $data['status'] ?? $guest->status,
            'group'              => $data['group'] ?? null,
            'special_role'       => $this->validateSpecialRole($data['special_role'] ?? null),
            'table_number'       => $this->sanitizeShortText($data['table_number'] ?? null, 50),
            'invited_by'         => $this->sanitizeShortText($data['invited_by'] ?? null, 100),
            'companion_names'    => $this->validateCompanionNames($data['companion_names'] ?? null),
            'accompanists_count' => (int) ($data['accompanists_count'] ?? 0),
        ]);

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
     * @return list<string>|null
     */
    private function validateCompanionNames(mixed $names): ?array
    {
        if (!is_array($names) || empty($names)) {
            return null;
        }

        $cleaned = [];
        foreach ($names as $n) {
            if (!is_string($n)) {
                continue;
            }
            $trimmed = mb_substr(trim($n), 0, 255);
            if ($trimmed !== '') {
                $cleaned[] = $trimmed;
            }
        }

        return empty($cleaned) ? null : array_slice($cleaned, 0, 20);
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
