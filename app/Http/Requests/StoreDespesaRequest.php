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
        $eventId = $this->route('evento')->id;

        return [
            // Dados da despesa
            'fornecedor_nome'   => ['required', 'string', 'max:255'],
            'categoria'         => ['required', 'string', 'max:100'],
            'descricao'         => ['nullable', 'string'],
            'valor_total'       => ['required', 'numeric', 'min:0.01'],
            'comprovante_url'   => ['nullable', 'string', 'url', 'max:500'],
            'observacoes'       => ['nullable', 'string'],
            'contrato'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'pix_key'           => ['nullable', 'string', 'max:255'],
            'pix_copia_e_cola'  => ['nullable', 'string'],

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

            // Parcelas explícitas (cada uma com valor e vencimento)
            'parcelas'              => ['required', 'array', 'min:1'],
            'parcelas.*.valor'      => ['required', 'numeric', 'min:0.01'],
            'parcelas.*.vencimento' => ['required', 'date'],
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

            // Se todos usam percentual (não nulo e não vazio), a soma deve ser 100
            $todos_com_percentual = count($pagadores) > 0 && collect($pagadores)->every(
                fn($p) => isset($p['percentual']) && $p['percentual'] !== null && $p['percentual'] !== ''
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

    public function messages(): array
    {
        return [
            'fornecedor_nome.required' => 'O nome do fornecedor é obrigatório.',
            'fornecedor_nome.max'      => 'O nome do fornecedor deve ter no máximo 255 caracteres.',
            'categoria.required'       => 'A categoria é obrigatória.',
            'valor_total.required'     => 'O valor total é obrigatório.',
            'valor_total.numeric'      => 'O valor total deve ser um número.',
            'valor_total.min'          => 'O valor total deve ser maior que zero.',
            'pagadores.required'       => 'Selecione ao menos um pagador.',
            'pagadores.min'            => 'Selecione ao menos um pagador.',
            'pagadores.*.pagador_id.required' => 'Selecione o pagador.',
            'pagadores.*.pagador_id.exists'   => 'Pagador não encontrado neste evento.',
            'parcelas.required'              => 'Adicione ao menos uma parcela.',
            'parcelas.min'                   => 'A despesa deve ter ao menos uma parcela.',
            'parcelas.*.valor.required'      => 'Informe o valor de cada parcela.',
            'parcelas.*.valor.numeric'       => 'O valor da parcela deve ser um número.',
            'parcelas.*.valor.min'           => 'O valor mínimo de cada parcela é R$ 0,01.',
            'parcelas.*.vencimento.required' => 'Informe a data de vencimento de cada parcela.',
            'parcelas.*.vencimento.date'     => 'A data de vencimento deve ser uma data válida.',
            'contrato.file'  => 'O contrato deve ser um arquivo válido.',
            'contrato.mimes' => 'O contrato deve ser PDF, JPG, PNG ou WebP.',
            'contrato.max'   => 'O arquivo do contrato deve ter no máximo 10 MB.',
        ];
    }

    public function attributes(): array
    {
        return [
            'fornecedor_nome'         => 'nome do fornecedor',
            'valor_total'             => 'valor total',
            'parcelas'                => 'parcelas',
            'parcelas.*.valor'        => 'valor da parcela',
            'parcelas.*.vencimento'   => 'data de vencimento',
            'pagadores.*.pagador_id'  => 'pagador',
            'pagadores.*.percentual'  => 'percentual do pagador',
            'pagadores.*.valor'       => 'valor do pagador',
        ];
    }
}
