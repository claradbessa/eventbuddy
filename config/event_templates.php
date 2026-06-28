<?php

/**
 * Templates de checklist por tipo de evento.
 *
 * Cada tarefa contém:
 *   title               — nome da tarefa em PT-BR
 *   priority            — 'alta' | 'media' | 'baixa'
 *   months_before       — meses antes da data do evento para definir o vencimento
 *                         (0 = mesmo mês do evento; null = sem prazo calculado)
 *   auto_check_category — (opcional) slug que referencia a categoria de fornecedor;
 *                         quando um fornecedor com categoria equivalente é cadastrado,
 *                         a tarefa é concluída automaticamente.
 *
 * Slugs disponíveis para auto_check_category:
 *   assessoria | espaco | fotografia | buffet | musica | decoracao | maquiagem
 *   bolo | bar | audiovisual | transporte | seguranca | recreacao
 */

return [

    // ── Casamento ─────────────────────────────────────────────────────────────
    'wedding' => [
        ['title' => 'Definir orçamento total',                               'priority' => 'alta',  'months_before' => 12],
        ['title' => 'Contratar assessoria ou cerimonialista',                 'priority' => 'alta',  'months_before' => 12, 'auto_check_category' => 'assessoria'],
        ['title' => 'Definir local da cerimônia e recepção',                  'priority' => 'alta',  'months_before' => 12, 'auto_check_category' => 'espaco'],
        ['title' => 'Montar primeira versão da lista de convidados',          'priority' => 'media', 'months_before' => 12],

        ['title' => 'Contratar fotógrafo e cinegrafista',                     'priority' => 'alta',  'months_before' =>  9, 'auto_check_category' => 'fotografia'],
        ['title' => 'Contratar buffet e agendar degustação',                  'priority' => 'alta',  'months_before' =>  9, 'auto_check_category' => 'buffet'],
        ['title' => 'Contratar DJ ou banda e estrutura de som/luz',           'priority' => 'alta',  'months_before' =>  9, 'auto_check_category' => 'musica'],
        ['title' => 'Pesquisar vestido de noiva e traje',                     'priority' => 'alta',  'months_before' =>  9],
        ['title' => 'Definir e convidar Padrinhos e Madrinhas',               'priority' => 'media', 'months_before' =>  9],

        ['title' => 'Definir decoração e projeto floral',                     'priority' => 'alta',  'months_before' =>  6, 'auto_check_category' => 'decoracao'],
        ['title' => 'Criar identidade visual e convites',                     'priority' => 'media', 'months_before' =>  6],
        ['title' => 'Contratar bar de coquetéis',                             'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'bar'],
        ['title' => 'Encomendar bolo e doces finos',                          'priority' => 'alta',  'months_before' =>  6, 'auto_check_category' => 'bolo'],
        ['title' => 'Contratar maquiagem e cabelo (Dia da Noiva)',             'priority' => 'alta',  'months_before' =>  6, 'auto_check_category' => 'maquiagem'],

        ['title' => 'Dar entrada no casamento civil no cartório',             'priority' => 'alta',  'months_before' =>  3],
        ['title' => 'Enviar convites oficiais',                               'priority' => 'alta',  'months_before' =>  3],
        ['title' => 'Criar e publicar lista de presentes',                    'priority' => 'media', 'months_before' =>  3],

        ['title' => 'Fazer prova final das roupas',                           'priority' => 'alta',  'months_before' =>  1],
        ['title' => 'Confirmar presença dos convidados (RSVP final)',          'priority' => 'media', 'months_before' =>  1],
        ['title' => 'Fechar playlist oficial com o DJ',                       'priority' => 'media', 'months_before' =>  1],
        ['title' => 'Alinhar cronograma final com todos os fornecedores',     'priority' => 'alta',  'months_before' =>  1],
    ],

    // ── Aniversário ───────────────────────────────────────────────────────────
    'birthday' => [
        ['title' => 'Definir tema e conceito da festa',                                   'priority' => 'alta',  'months_before' => 4],

        ['title' => 'Escolher e reservar o local',                                        'priority' => 'alta',  'months_before' => 3, 'auto_check_category' => 'espaco'],
        ['title' => 'Estipular quantidade estimada de convidados',                        'priority' => 'alta',  'months_before' => 3],
        ['title' => 'Montar lista de convidados',                                         'priority' => 'media', 'months_before' => 3],

        ['title' => 'Contratar buffet ou definir cardápio',                               'priority' => 'alta',  'months_before' => 2, 'auto_check_category' => 'buffet'],
        ['title' => 'Encomendar bolo e doces temáticos',                                  'priority' => 'alta',  'months_before' => 2, 'auto_check_category' => 'bolo'],
        ['title' => 'Enviar convites',                                                    'priority' => 'media', 'months_before' => 2],
        ['title' => 'Contratar DJ ou entretenimento',                                     'priority' => 'media', 'months_before' => 2, 'auto_check_category' => 'musica'],
        ['title' => 'Contratar recreação infantil, brinquedos ou entretenimento',         'priority' => 'media', 'months_before' => 2, 'auto_check_category' => 'recreacao'],
        ['title' => 'Definir e encomendar lembrancinhas',                                 'priority' => 'media', 'months_before' => 2],

        ['title' => 'Organizar decoração e balões temáticos',                             'priority' => 'baixa', 'months_before' => 1, 'auto_check_category' => 'decoracao'],
        ['title' => 'Alugar mobiliário complementar e suportes de doces',                 'priority' => 'media', 'months_before' => 1],
        ['title' => 'Confirmar presença dos convidados',                                  'priority' => 'baixa', 'months_before' => 1],
        ['title' => 'Criar playlist personalizada da festa',                              'priority' => 'baixa', 'months_before' => 1],

        ['title' => 'Comprar descartáveis extras, velas e balões reserva',                'priority' => 'baixa', 'months_before' => 0],
    ],

    // ── 15 Anos ───────────────────────────────────────────────────────────────
    'debutante' => [
        ['title' => 'Definir orçamento limite da festa',                                  'priority' => 'alta',  'months_before' => 12],
        ['title' => 'Contratar assessoria ou cerimonialista',                             'priority' => 'alta',  'months_before' => 12, 'auto_check_category' => 'assessoria'],

        ['title' => 'Escolher e reservar o salão',                                        'priority' => 'alta',  'months_before' => 10, 'auto_check_category' => 'espaco'],

        ['title' => 'Definir tema e paleta de cores',                                     'priority' => 'alta',  'months_before' =>  8],
        ['title' => 'Escolher o vestido da debutante',                                    'priority' => 'alta',  'months_before' =>  8],
        ['title' => 'Contratar fotógrafo e cinegrafista',                                 'priority' => 'alta',  'months_before' =>  8, 'auto_check_category' => 'fotografia'],

        ['title' => 'Estipular quantidade estimada de convidados',                        'priority' => 'alta',  'months_before' =>  6],
        ['title' => 'Contratar buffet e fazer degustação',                                'priority' => 'alta',  'months_before' =>  6, 'auto_check_category' => 'buffet'],
        ['title' => 'Contratar DJ ou banda',                                              'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'musica'],
        ['title' => 'Definir e convidar oficialmente as 15 damas e cavaleiros',           'priority' => 'media', 'months_before' =>  6],
        ['title' => 'Contratar estrutura de som, luz cênica e pista de LED',              'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'audiovisual'],

        ['title' => 'Iniciar ensaios de valsa e coreografias',                            'priority' => 'media', 'months_before' =>  4],
        ['title' => 'Agendar o Dia da Princesa (Cabelo e Maquiagem)',                     'priority' => 'media', 'months_before' =>  4, 'auto_check_category' => 'maquiagem'],
        ['title' => 'Agendar ensaio fotográfico (Pré-15 anos)',                           'priority' => 'media', 'months_before' =>  4],

        ['title' => 'Encomendar bolo e doces temáticos',                                  'priority' => 'media', 'months_before' =>  3, 'auto_check_category' => 'bolo'],
        ['title' => 'Enviar convites',                                                    'priority' => 'media', 'months_before' =>  3],

        ['title' => 'Fazer a prova do vestido',                                           'priority' => 'media', 'months_before' =>  2],
        ['title' => 'Preparar lembrancinhas para os convidados',                          'priority' => 'baixa', 'months_before' =>  2],
        ['title' => 'Escolher as músicas dos momentos-chave (Valsa, Entrada)',             'priority' => 'media', 'months_before' =>  2],
        ['title' => 'Montar vídeo da retrospectiva',                                      'priority' => 'baixa', 'months_before' =>  2],

        ['title' => 'Contratar serviço de RSVP para confirmação de presença',             'priority' => 'alta',  'months_before' =>  1],
        ['title' => 'Comprar chinelos/rasteirinhas personalizadas',                        'priority' => 'baixa', 'months_before' =>  1],
    ],

    // ── Chá de Bebê ───────────────────────────────────────────────────────────
    'baby_shower' => [
        ['title' => 'Definir a data do evento',                                           'priority' => 'alta',  'months_before' => 3],

        ['title' => 'Montar a lista de presentes e fraldas no EventBuddy',                'priority' => 'alta',  'months_before' => 2],
        ['title' => 'Escolher o local do evento',                                         'priority' => 'alta',  'months_before' => 2, 'auto_check_category' => 'espaco'],
        ['title' => 'Definir o tema da festa',                                            'priority' => 'alta',  'months_before' => 2],
        ['title' => 'Contratar fotógrafo',                                                'priority' => 'media', 'months_before' => 2, 'auto_check_category' => 'fotografia'],
        ['title' => 'Enviar convites',                                                    'priority' => 'media', 'months_before' => 2],

        ['title' => 'Encomendar bolo e doces temáticos',                                  'priority' => 'alta',  'months_before' => 1, 'auto_check_category' => 'bolo'],
        ['title' => 'Definir cardápio e salgados',                                        'priority' => 'media', 'months_before' => 1, 'auto_check_category' => 'buffet'],
        ['title' => 'Preparar lembrancinhas temáticas',                                   'priority' => 'baixa', 'months_before' => 1],
        ['title' => 'Organizar dinâmicas e brincadeiras',                                 'priority' => 'baixa', 'months_before' => 1],
        ['title' => 'Comprar brindes para os vencedores das brincadeiras',                'priority' => 'baixa', 'months_before' => 1],
        ['title' => 'Montar livro ou quadro de mensagens para o bebê',                    'priority' => 'baixa', 'months_before' => 1],
    ],

    // ── Formatura ─────────────────────────────────────────────────────────────
    'graduation' => [
        ['title' => 'Montar a Comissão de Formatura',                                     'priority' => 'alta',  'months_before' => 12],
        ['title' => 'Abrir conta bancária da comissão e definir estatuto',                'priority' => 'alta',  'months_before' => 12],
        ['title' => 'Contratar empresa de arrecadação e gestão de boletos',               'priority' => 'alta',  'months_before' => 10],
        ['title' => 'Definir e reservar o local do baile de gala',                        'priority' => 'alta',  'months_before' =>  8, 'auto_check_category' => 'espaco'],

        ['title' => 'Contratar buffet e definir cardápio principal',                      'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'buffet'],
        ['title' => 'Contratar DJ, banda e estrutura de som/luz',                         'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'musica'],
        ['title' => 'Contratar fotógrafo e equipe de filmagem',                           'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'fotografia'],
        ['title' => 'Organizar cenografia e decoração da colação e do baile',             'priority' => 'media', 'months_before' =>  6, 'auto_check_category' => 'decoracao'],

        ['title' => 'Agendar sessões de fotos oficiais de estúdio (com beca)',            'priority' => 'baixa', 'months_before' =>  4],
        ['title' => 'Alinhar roteiro da colação de grau com oradores e homenageados',     'priority' => 'baixa', 'months_before' =>  2],
        ['title' => 'Definir cardápio e atrações do bar de drinks',                       'priority' => 'baixa', 'months_before' =>  2, 'auto_check_category' => 'bar'],
    ],

    // ── Corporativo ───────────────────────────────────────────────────────────
    'corporate' => [
        ['title' => 'Definir objetivo e pauta do evento',                                 'priority' => 'alta',  'months_before' => 6],

        ['title' => 'Aprovar orçamento com a gestão',                                     'priority' => 'alta',  'months_before' => 5],

        ['title' => 'Escolher e reservar local (sala, auditório ou espaço)',               'priority' => 'alta',  'months_before' => 4, 'auto_check_category' => 'espaco'],
        ['title' => 'Contratar assessoria ou empresa de eventos',                          'priority' => 'media', 'months_before' => 4, 'auto_check_category' => 'assessoria'],

        ['title' => 'Confirmar palestrantes e grade de atividades',                       'priority' => 'alta',  'months_before' => 3],
        ['title' => 'Emitir alvarás, licenças e seguro do evento',                        'priority' => 'alta',  'months_before' => 3],
        ['title' => 'Criar hotsite/página para inscrições ou ingressos',                  'priority' => 'alta',  'months_before' => 3],

        ['title' => 'Enviar convites e gerenciar inscrições',                             'priority' => 'media', 'months_before' => 2],
        ['title' => 'Contratar catering ou coffee break',                                 'priority' => 'media', 'months_before' => 2, 'auto_check_category' => 'buffet'],
        ['title' => 'Preparar material gráfico e comunicação visual',                     'priority' => 'media', 'months_before' => 2],
        ['title' => 'Contratar equipe de recepção, segurança e credenciamento',           'priority' => 'alta',  'months_before' => 2, 'auto_check_category' => 'seguranca'],
        ['title' => 'Reservar hotel e hospedagem para palestrantes/convidados',           'priority' => 'media', 'months_before' => 2],
        ['title' => 'Comprar passagens aéreas ou providenciar logística de transporte',   'priority' => 'media', 'months_before' => 2, 'auto_check_category' => 'transporte'],
        ['title' => 'Produzir e encomendar brindes corporativos (crachás, blocos)',       'priority' => 'media', 'months_before' => 2],
        ['title' => 'Contratar fotografia institucional/cobertura',                       'priority' => 'baixa', 'months_before' => 2, 'auto_check_category' => 'fotografia'],

        ['title' => 'Contratar suporte técnico (AV, microfones, internet)',               'priority' => 'alta',  'months_before' => 1, 'auto_check_category' => 'audiovisual'],
        ['title' => 'Alinhar necessidades técnicas de palco com palestrantes',            'priority' => 'media', 'months_before' => 1],

        ['title' => 'Confirmar presença dos participantes',                               'priority' => 'baixa', 'months_before' => 0],
        ['title' => 'Disparar pesquisa de satisfação pós-evento',                         'priority' => 'baixa', 'months_before' => 0],
    ],

];
