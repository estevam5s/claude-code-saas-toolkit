# Checklist de Segurança para SaaS (OWASP Top 10 · NIST · LGPD)

Marque cada item ao aplicar. Itens críticos para um SaaS multi-tenant com Stripe + Supabase.

## Abuso de API e rede
- [ ] Rate limiting em APIs (por IP, usuário e API Key).
- [ ] Proteção contra DDoS, bots, brute force e ferramentas (Hydra/etc.).
- [ ] Limitação de contas gratuitas por IP, fingerprint, dispositivo, VPN/proxy/TOR (antifraude).
- [ ] Uploads validados (tipo, tamanho, antivírus quando aplicável).

## Autenticação e sessão
- [ ] CAPTCHA em login, cadastro e recuperação de senha.
- [ ] Bloqueio temporário/progressivo após múltiplas falhas de login.
- [ ] MFA/2FA obrigatório para admins, opcional para usuários.
- [ ] Senhas com bcrypt (Supabase Auth) ou Argon2id para hashing próprio.
- [ ] Verificação de e-mail + bloqueio de e-mails temporários.
- [ ] Logout invalida refresh tokens e sessões (scope global).
- [ ] Expiração automática de sessão por inatividade.
- [ ] Cookies `Secure`, `HttpOnly`, `SameSite`.

## Controle de acesso
- [ ] RBAC e proteção de rotas administrativas (usuário comum não acessa /admin).
- [ ] Separação super-admin (dono) × admin de tenant.
- [ ] RLS no Supabase em todas as tabelas sensíveis (sem recursão de policy).
- [ ] `is_admin()` SECURITY DEFINER (não consulta a própria tabela sob RLS).

## Web
- [ ] CORS configurado (allowlist).
- [ ] Proteção contra CSRF (SameSite + verificação de origem), XSS (escape/CSP), SQL/NoSQL Injection, SSRF.
- [ ] Headers: HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, CSP.

## Dados e operação
- [ ] Criptografia em trânsito (HTTPS/TLS) e em repouso para dados sensíveis.
- [ ] Backups automáticos e criptografados (export + import/restauração).
- [ ] Logs de auditoria para ações críticas + tentativas de invasão na rota "Logs".
- [ ] Monitoramento de atividades suspeitas e alertas.
- [ ] Gestão segura de segredos/chaves/variáveis (nunca no bundle do frontend; service_role só no backend).
- [ ] Atualização constante de dependências.

## Pagamentos (Stripe)
- [ ] Webhook com verificação de assinatura (`constructEvent`) + idempotência por `stripe_event_id`.
- [ ] Confirmação de que a cobrança recorre nos próximos meses (`invoice.paid` / `subscription.updated`).
- [ ] Reembolso e downgrade tratados (até 7 dias / agendado).

## Conformidade e testes
- [ ] LGPD: consentimento, exportação e exclusão de dados (apagar e liberar o e-mail).
- [ ] Testes de carga, estresse, segurança e pentest periódicos.
- [ ] Alinhamento com OWASP Top 10 e NIST.

**Objetivo:** minimizar risco de vazamento de dados, invasões, fraudes, abuso da plataforma e acessos não autorizados.
