<?php

use App\Services\Checklist\AutoCheckService;

// ── normalizeCategoriaToSlugs ────────────────────────────────────────────────

describe('normalizeCategoriaToSlugs', function () {
    beforeEach(function () {
        $this->service = new AutoCheckService();
    });

    it('maps fotografia keywords to fotografia slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('fotografia');
    })->with([
        'Fotografia e Vídeo',
        'Fotógrafo',
        'Cinegrafista',
        'Filmagem',
        'Drone Filmagem',
        'Álbum de fotos',
    ]);

    it('maps buffet keywords to buffet slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('buffet');
    })->with([
        'Buffet e Catering',
        'Coffee Break',
        'Alimentação',
        'Gastronomia',
        'Jantar de Gala',
    ]);

    it('maps espaco keywords to espaco slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('espaco');
    })->with([
        'Local da Cerimônia',
        'Salão de Festas',
        'Auditório',
        'Chácara',
        'Sítio',
        'Casa de festas',
    ]);

    it('maps musica keywords to musica slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('musica');
    })->with([
        'DJ',
        'Banda ao Vivo',
        'Iluminação Cênica',
        'Trio Elétrico',
        'Violinista',
    ]);

    it('maps maquiagem keywords to maquiagem slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('maquiagem');
    })->with([
        'Maquiagem e Cabelo',
        'Hair e Make',
        'Dia da Noiva',
        'Penteado',
    ]);

    it('maps bolo keywords to bolo slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('bolo');
    })->with([
        'Bolo de Casamento',
        'Confeitaria',
        'Doceria',
        'Doces Finos',
        'Mesa de Candy',
    ]);

    it('maps bar keywords to bar slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('bar');
    })->with([
        'Open Bar',
        'Drinks e Bebidas',
        'Cerveja Artesanal',
        'Sommelier',
    ]);

    it('maps transporte keywords to transporte slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('transporte');
    })->with([
        'Transporte de Convidados',
        'Limusine',
        'Van Executiva',
        'Transfer Aeroporto',
        'Motorista',
    ]);

    it('maps assessoria keywords to assessoria slug', function (string $input) {
        expect($this->service->normalizeCategoriaToSlugs($input))->toContain('assessoria');
    })->with([
        'Assessoria de Casamento',
        'Cerimonial',
        'Organização de Eventos',
        'Produção do Evento',
    ]);

    it('strips accents before matching', function () {
        expect($this->service->normalizeCategoriaToSlugs('Fotografía'))->toContain('fotografia');
        expect($this->service->normalizeCategoriaToSlugs('Cerimônia'))->toContain('espaco');
    });

    it('is case-insensitive', function () {
        expect($this->service->normalizeCategoriaToSlugs('FOTOGRAFIA'))->toContain('fotografia');
        expect($this->service->normalizeCategoriaToSlugs('dj e som'))->toContain('musica');
    });

    it('returns multiple slugs when category matches several areas', function () {
        $slugs = $this->service->normalizeCategoriaToSlugs('Buffet com open bar e DJ');
        expect($slugs)->toContain('buffet')
                      ->toContain('bar')
                      ->toContain('musica');
    });

    it('returns empty array for unrecognized categories', function () {
        expect($this->service->normalizeCategoriaToSlugs('Aluguel de Cadeiras'))->toBe([]);
        expect($this->service->normalizeCategoriaToSlugs('Gráfica'))->toBe([]);
        expect($this->service->normalizeCategoriaToSlugs('Tapete Vermelho'))->toBe([]);
    });

    it('returns empty array for empty string', function () {
        expect($this->service->normalizeCategoriaToSlugs(''))->toBe([]);
    });
});
