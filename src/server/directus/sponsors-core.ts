export type SponsorInput = {
  nome?: string;
  link?: string;
  imagem?: string;
  status?: string;
};

export type SponsorView = {
  id: number;
  nome: string;
  link: string;
  imagem: string;
  status: 'ativo' | 'inativo';
};

type SponsorDbRow = Record<string, unknown>;

export function normalizeSponsorLink(input: string): string {
  const trimmed = String(input || '').trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed) && !/\s/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function mapSponsorDbRow(row: SponsorDbRow, useV2: boolean): SponsorView {
  if (useV2) {
    return {
      id: Number(row.id),
      nome: stringOrEmpty(row.name),
      link: stringOrEmpty(row.link),
      imagem: stringOrEmpty(row.image),
      status: row.active ? 'ativo' : 'inativo',
    };
  }

  return {
    id: Number(row.id),
    nome: stringOrEmpty(row.nome),
    link: stringOrEmpty(row.link),
    imagem: stringOrEmpty(row.imagem),
    status: row.status === 'inativo' ? 'inativo' : 'ativo',
  };
}

export function sponsorAppToDb(input: SponsorInput, useV2: boolean): Record<string, unknown> {
  if (!useV2) return { ...input };

  const db: Record<string, unknown> = {};
  if (input.nome !== undefined) db.name = input.nome;
  if (input.link !== undefined) db.link = input.link;
  if (input.imagem !== undefined) db.image = input.imagem;
  if (input.status !== undefined) db.active = input.status === 'ativo';
  return db;
}

export function normalizeSponsorInput<T extends SponsorInput>(input: T): T {
  return {
    ...input,
    ...(input.link !== undefined ? { link: normalizeSponsorLink(input.link) } : {}),
  };
}
