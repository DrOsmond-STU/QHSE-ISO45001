-- CreateTable
CREATE TABLE "_rls_smoke_test" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "_rls_smoke_test_pkey" PRIMARY KEY ("id")
);
