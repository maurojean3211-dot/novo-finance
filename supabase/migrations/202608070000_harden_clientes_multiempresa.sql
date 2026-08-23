-- HARDEN CLIENTES MULTIEMPRESA
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.clientes
    WHERE empresa_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'ABORTADO: existem clientes sem empresa_id';
  END IF;
END $$;

ALTER TABLE public.clientes
  ALTER COLUMN empresa_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.clientes'::regclass
      AND conname = 'clientes_empresa_fkey'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_empresa_fkey
      FOREIGN KEY (empresa_id)
      REFERENCES public.empresas(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.clientes'::regclass
      AND conname = 'clientes_id_empresa_key'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_id_empresa_key
      UNIQUE (id, empresa_id);
  END IF;
END $$;

COMMIT;