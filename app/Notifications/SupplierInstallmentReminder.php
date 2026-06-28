<?php

namespace App\Notifications;

use App\Models\FornecedorDespesa;
use App\Models\ParcelaDespesa;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SupplierInstallmentReminder extends Notification
{
    use Queueable;

    public function __construct(
        private readonly FornecedorDespesa $fornecedor,
        private readonly ParcelaDespesa $parcela,
        private readonly int $daysUntilDue,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $due        = $this->parcela->data_vencimento->format('d/m/Y');
        $valor      = 'R$ ' . number_format((float) $this->parcela->valor_parcela, 2, ',', '.');
        $fornecedor = $this->fornecedor->fornecedor_nome;

        $message = match (true) {
            $this->daysUntilDue === 0 => "Hoje vence a parcela de {$valor} de {$fornecedor}.",
            $this->daysUntilDue === 1 => "Amanhã vence a parcela de {$valor} de {$fornecedor}.",
            default                   => "Em {$this->daysUntilDue} dias vence a parcela de {$valor} de {$fornecedor} ({$due}).",
        };

        return [
            'title'    => 'Vencimento de Parcela',
            'message'  => $message,
            'category' => 'payment',
            'meta'     => [
                'fornecedor_id'   => $this->fornecedor->id,
                'fornecedor_nome' => $fornecedor,
                'parcela_id'      => $this->parcela->id,
                'numero_parcela'  => $this->parcela->numero_parcela,
                'valor_parcela'   => (float) $this->parcela->valor_parcela,
                'data_vencimento' => $this->parcela->data_vencimento->toDateString(),
                'days_until_due'  => $this->daysUntilDue,
                'event_id'        => $this->fornecedor->event_id,
            ],
        ];
    }
}
