<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDespesaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autorização de tenant feita pelo middleware EnsureEventAccess
        return true;
    }

    public function rules(): array
    {
        $eventId = $this->route('event')->id;

        return [
            // Dados da despesa
            'fornecedor_nome'   => ['required', 'string', 'max:255'],
            'categoria'         => ['required', 'string', 'max:100'],
            'descricao'         => ['nullable', 'string'],
            'valor_total'       => ['required', 'numeric', 'min:0.01'],
            'comprovante_url'   => ['nullable', 'string', 'url', 'max:500'],
            'observacoes'       => ['nullable', 'string'],

            // Pagadores: array com ao menos 1 item
            'pagadores'         => ['required', 'array', 'min:1'],
            'pagadores.*.pagador_id' => [
                'required',
                'integer',
                // Garante que o pagador pertence a este evento (escopo de tenant)
                Rule::exists('event_pagadores', 'id')->where('event_id', $eventId),
            ],
            'pagadores.*.percentual' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'pagadores.*.valor'      => ['nullable', 'numeric', 'min:0'],

            // Parcelamento
            'parcelas_quantidade'  => ['required', 'integer', 'min:1', 'max:60'],
            'primeiro_vencimento'  => ['required', 'date', 'after_or_equal:today'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $pagadores = $this->input('pagadores', []);

            // Valida que ao menos percentual OU valor está preenchido em cada item
            foreach ($pagadores as $i => $p) {
                if (empty($p['percentual']) && empty($p['valor'])) {
                    $validator->errors()->add(
                        "pagadores.{$i}",
                        'Cada pagador deve ter percentual ou valor informado.'
                    );
                }
            }

            // Se todos usam percentual, a soma deve ser 100
            $todos_com_percentual = collect($pagadores)->every(
                fn($p) => isset($p['percentual']) && $p['percentual'] !== null
            );

            if ($todos_com_percentual) {
                $soma = collect($pagadores)->sum('percentual');
                if (abs($soma - 100) > 0.01) {
                    $validator->errors()->add(
                        'pagadores',
                        "A soma dos percentuais deve ser 100%. Total informado: {$soma}%."
                    );
                }
            }
        });
    }

    public function attributes(): array
    {
        return [
            'fornecedor_nome'        => 'nome do fornecedor',
            'valor_total'            => 'valor total',
            'parcelas_quantidade'    => 'número de parcelas',
            'primeiro_vencimento'    => 'data do primeiro vencimento',
            'pagadores.*.pagador_id' => 'pagador',
            'pagadores.*.percentual' => 'percentual do pagador',
            'pagadores.*.valor'      => 'valor do pagador',
        ];
    }
}
