# Gevon BusinessOS — Production Launch Checklist

## Environment
- [ ] SUPABASE_URL configured
- [ ] SUPABASE_PUBLISHABLE_KEY configured
- [ ] SUPABASE_SERVICE_ROLE_KEY configured
- [ ] INTEGRATION_ENCRYPTION_KEY configured
- [ ] APP_URL configured
- [ ] APP_VERSION configured

## Database
- [ ] All migrations applied (M1-M15)
- [ ] RLS enabled on all tables
- [ ] Indexes created on high-traffic tables
- [ ] Audit triggers active
- [ ] Timestamp triggers active

## Authentication & Authorization
- [ ] Supabase Auth configured
- [ ] requireSupabaseAuth middleware active
- [ ] requirePlatformAdmin middleware active
- [ ] RLS policies verified
- [ ] Tenant isolation verified
- [ ] Branch isolation verified

## Security
- [ ] Security headers configured
- [ ] Input validation active
- [ ] Rate limiting configured
- [ ] Webhook signatures verified
- [ ] Secrets encrypted at rest
- [ ] API keys hashed
- [ ] OAuth tokens encrypted
- [ ] Audit logging active

## Features
- [ ] Industry profiles seeded
- [ ] Onboarding flow functional
- [ ] Module recommendations working
- [ ] Navigation industry-aware
- [ ] Dashboard configurable
- [ ] Feature flags evaluated
- [ ] Event bus operational
- [ ] Job runner operational
- [ ] Webhooks operational
- [ ] Integrations operational

## Infrastructure
- [ ] Render Web Service configured (or Cloudflare Worker deployed)
- [ ] Build command: `npm run build:node`
- [ ] Start command: `node .output/server/index.mjs`
- [ ] Environment variables set in Render dashboard
- [ ] Health check endpoint responding

## Performance
- [ ] Dashboard loads < 2s
- [ ] Server functions optimized
- [ ] Pagination implemented
- [ ] Large imports async
- [ ] Indexes optimized

## Observability
- [ ] System health checks running
- [ ] Error monitoring configured
- [ ] Failed job alerts configured
- [ ] Failed webhook alerts configured

## Backup & Recovery
- [ ] Database backups scheduled
- [ ] Recovery procedure documented
- [ ] Migration rollback tested

## Launch
- [ ] Feature flags configured
- [ ] Trial experience configured
- [ ] Admin controls verified
- [ ] Documentation published
