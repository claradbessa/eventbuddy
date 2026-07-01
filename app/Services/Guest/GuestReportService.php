<?php

namespace App\Services\Guest;

use App\Models\Guest;
use App\Models\TenantEvent;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpFoundation\Response as BaseResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GuestReportService
{
    /**
     * CSV dump — Nome, Telefone, Grupo, Mesa, Convidado de, Acompanhantes, Status.
     * Respeita os mesmos filtros ativos na listagem.
     *
     * @param array<string, string|null> $filters
     */
    public function exportToCsv(TenantEvent $evento, array $filters = []): StreamedResponse
    {
        $guests   = $this->loadGuests($evento, $filters);
        $filename = 'convidados-' . $evento->slug . '-' . now()->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($guests): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            // BOM para compatibilidade com Excel no Windows
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Nome', 'Telefone', 'Grupo / Família', 'Mesa',
                'Convidado de', 'Acompanhantes', 'Status',
            ], ';');

            foreach ($guests as $guest) {
                $companions = collect($guest->companion_names ?? [])
                    ->map(function (mixed $c): string {
                        if (is_array($c)) {
                            $name = $c['name'] ?? '';
                            return is_string($name) ? $name : '';
                        }
                        return is_string($c) ? $c : '';
                    })
                    ->filter()
                    ->join(', ');

                fputcsv($handle, [
                    $guest->name,
                    $guest->phone        ?? '',
                    $guest->group        ?? '',
                    $guest->table_number ?? '',
                    $guest->invited_by   ?? '',
                    $companions !== ''
                        ? $companions
                        : ($guest->accompanists_count > 0 ? "+{$guest->accompanists_count}" : ''),
                    match ($guest->status) {
                        'confirmed' => 'Confirmado',
                        'declined'  => 'Recusou',
                        default     => 'Pendente',
                    },
                ], ';');
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * PDF para a portaria — ordem alfabética, campo de presença, design limpo.
     */
    public function generateReceptionPdf(TenantEvent $evento): BaseResponse
    {
        $guests = $this->loadGuests($evento);

        $pdf = Pdf::loadView('reports.guests.reception', compact('evento', 'guests'))
            ->setPaper('a4', 'portrait');

        return $pdf->download('recepcao-' . $evento->slug . '-' . now()->format('Ymd') . '.pdf');
    }

    /**
     * PDF para o cerimonial — agrupado por mesa, listando os ocupantes de cada uma.
     */
    public function generateSeatingPdf(TenantEvent $evento): BaseResponse
    {
        $guests = $this->loadGuests($evento);

        $byTable = $guests
            ->sortBy(fn (Guest $g): string => $g->table_number ?? 'zzz')
            ->groupBy(fn (Guest $g): string => $g->table_number ?? '__none__');

        $pdf = Pdf::loadView('reports.guests.seating', compact('evento', 'byTable'))
            ->setPaper('a4', 'portrait');

        return $pdf->download('mesas-' . $evento->slug . '-' . now()->format('Ymd') . '.pdf');
    }

    /**
     * @param array<string, string|null> $filters
     * @return Collection<int, Guest>
     */
    private function loadGuests(TenantEvent $evento, array $filters = []): Collection
    {
        return $evento->guests()
            ->orderBy('name')
            ->byInvitedBy($filters['invited_by'] ?? null)
            ->byGroup($filters['group'] ?? null)
            ->byTable($filters['table'] ?? null)
            ->get();
    }
}
