<?php

namespace App\Console\Commands;

use App\Models\ParcelaDespesa;
use App\Models\User;
use App\Notifications\SupplierInstallmentReminder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:send-installment-reminders')]
#[Description('Envia lembretes de vencimento de parcelas para o dono do evento (1 dia e 3 dias antes).')]
class SendInstallmentReminders extends Command
{
    // Quantos dias antes do vencimento disparar lembretes
    private const REMIND_DAYS = [1, 3];

    public function handle(): int
    {
        $today = now()->toDateString();
        $sent  = 0;

        foreach (self::REMIND_DAYS as $days) {
            $targetDate = now()->addDays($days)->toDateString();

            $parcelas = ParcelaDespesa::query()
                ->with(['despesa.event.owner'])
                ->where('status', 'pendente')
                ->whereDate('data_vencimento', $targetDate)
                ->get();

            foreach ($parcelas as $parcela) {
                $owner = $parcela->despesa?->event?->owner;

                if (! $owner instanceof User) {
                    continue;
                }

                // Evita duplicata: não notifica se já existe uma não lida para esta parcela
                $alreadyNotified = $owner->unreadNotifications()
                    ->where('type', SupplierInstallmentReminder::class)
                    ->whereJsonContains('data->meta->parcela_id', $parcela->id)
                    ->exists();

                if ($alreadyNotified) {
                    continue;
                }

                $owner->notify(new SupplierInstallmentReminder(
                    fornecedor:   $parcela->despesa,
                    parcela:      $parcela,
                    daysUntilDue: $days,
                ));

                $sent++;
                $this->line("  → [{$owner->email}] {$parcela->despesa->fornecedor_nome} — parcela #{$parcela->numero_parcela} (em {$days}d)");
            }
        }

        $this->info("Lembretes enviados: {$sent}");

        return Command::SUCCESS;
    }
}
