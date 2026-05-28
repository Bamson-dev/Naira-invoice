-- One public link per invoice
DROP INDEX IF EXISTS "invoice_public_links_invoice_id_idx";
CREATE UNIQUE INDEX "invoice_public_links_invoice_id_key" ON "invoice_public_links"("invoice_id");
