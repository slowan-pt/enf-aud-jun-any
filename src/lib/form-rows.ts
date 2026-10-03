/**
 * Leitura de listas repetíveis enviadas por formulário (ver
 * src/components/admin/RowsEditor.astro). Cada coluna chega como um campo de
 * mesmo nome (`<prefixo>_<chave>`), então `getAll` devolve as linhas na ordem
 * em que aparecem na tela — reordenar e remover linhas funciona sem índices.
 */
export function readRows<K extends string>(
  form: FormData,
  prefix: string,
  keys: readonly K[],
  max = 50
): Record<K, string>[] {
  const columns = keys.map((key) => form.getAll(`${prefix}_${key}`).map((v) => String(v)));
  const count = Math.max(0, ...columns.map((c) => c.length));
  const rows: Record<K, string>[] = [];

  for (let index = 0; index < count; index++) {
    const row = {} as Record<K, string>;
    keys.forEach((key, column) => {
      row[key] = (columns[column]![index] ?? '').trim();
    });
    // Linha totalmente vazia (exceto ícone) = removida.
    const filled = keys.some((key) => key !== ('icon' as K) && key !== ('key' as K) && row[key] !== '');
    if (filled) rows.push(row);
  }
  return rows.slice(0, max);
}
