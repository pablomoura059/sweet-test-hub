-- Tornar bucket person-photos público
-- public=false impede URL pública (/storage/v1/object/public/...) de funcionar no navegador
-- Policies existentes em 20260902202010_controlam segurança por pasta userId
UPDATE storage.buckets SET public = true WHERE id = 'person-photos';
