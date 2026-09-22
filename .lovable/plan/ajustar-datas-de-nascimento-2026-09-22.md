# Ajustar datas de nascimento

## Alterações
- Criar funções compartilhadas para aplicar a máscara `DD/MM/AAAA`, validar datas reais e converter entre exibição e o formato `AAAA-MM-DD` usado no banco.
- Trocar somente os campos de nascimento por texto com teclado numérico no cadastro pelo Dashboard e no cadastro/edição da página Pessoas.
- Bloquear o salvamento quando a data preenchida estiver incompleta ou for inválida; manter o campo opcional e preservar todo o restante dos formulários.

## Validação
- Executar TypeScript e build.
- Testar na prévia os três fluxos: Nova Pessoa, Cadastrar nova pessoa em Novo Empréstimo e Editar Pessoa, incluindo máscara, rejeição de data inválida e ausência do calendário.

## Limites
- Nenhuma alteração em banco, RLS, Storage, documentos, empréstimos ou outros campos.
